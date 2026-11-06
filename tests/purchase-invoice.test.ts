import { dashboardRange } from "../src/dashboard/period";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { resetEnvironment } from "./helpers/environment";
import { catalog } from "./helpers/fixtures";
import { STORAGE_KEY } from "../src/settings/settings";
import {
  createPurchaseInvoice,
  purchaseInvoice,
} from "../src/purchasing/invoice";
import DatabaseBackupStore from "../src/database/DatabaseBackup";
import { createDatabaseStores } from "../src/database/DatabaseStores";

beforeEach(resetEnvironment);

test("invoice labels are readable and retain custom references", () => {
  const generated = createPurchaseInvoice();
  assert.match(generated, /^PUR-\d{8}-[A-F0-9]{8}$/);
  assert.notEqual(generated, createPurchaseInvoice());
  assert.equal(
    purchaseInvoice({ id: "old-id", reference: "Invoice 42" }),
    "Invoice 42",
  );
  assert.equal(
    purchaseInvoice({ id: "12345678-legacy", reference: "" }),
    "PUR-12345678",
  );
});

test("purchases generate invoices, preserve edits, reject duplicates atomically, and restore v7 backups", async () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ purchasing: true, stockManagement: true }),
  );
  const { stores, customer, product } = await catalog();
  const input = {
    contactId: customer.getId(),
    timestamp: 1000,
    reference: "",
    lines: [{ productId: product.getId(), quantity: 2.5, unitCost: 4 }],
  };
  const firstId = await stores.purchasingOS.receive(input);
  const first = await stores.purchasingOS.purchases.getOne(firstId);
  assert.match(first.reference, /^PUR-\d{8}-[A-F0-9]{8}$/);
  await stores.purchasingOS.receive({
    ...input,
    reference: "  My-Invoice-42  ",
  });
  const attempts = await Promise.allSettled([
    stores.purchasingOS.receive({ ...input, reference: "Same-Invoice" }),
    stores.purchasingOS.receive({ ...input, reference: "Same-Invoice" }),
  ]);
  assert.equal(
    attempts.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    attempts.filter((result) => result.status === "rejected").length,
    1,
  );
  await assert.rejects(
    stores.purchasingOS.receive({ ...input, reference: "My-Invoice-42" }),
    /invoice number is already used/,
  );
  const backup = await new DatabaseBackupStore(stores.database).export();
  assert.equal(backup.tables.PURCHASES.length, 3);
  assert.equal(backup.tables.PURCHASE_LINES.length, 3);
  assert.equal(backup.tables.STOCK[0].count, 7.5);
  assert.ok(
    backup.tables.PURCHASES.some((row) => row.reference === "My-Invoice-42"),
  );
  backup.databaseVersion = 7;
  const target = createDatabaseStores("restored");
  await new DatabaseBackupStore(target.database).restore(backup);
  assert.equal(
    (await target.purchasingOS.purchases.getOne(firstId)).reference,
    first.reference,
  );
});

test("purchasing sort reverses same-day purchases and payments before pagination", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, product, customer } = await catalog();
  const input = {
    contactId: customer.getId(),
    timestamp: 1000,
    reference: "",
    lines: [{ productId: product.getId(), quantity: 1, unitCost: 4 }],
  };
  for (let index = 0; index < 12; index++)
    await stores.purchasingOS.receive(input);
  await stores.purchasingOS.pay(customer.getId(), 5, 1000, "payment");
  await stores.purchasingOS.receive({ ...input, timestamp: 2000 });
  const range = dashboardRange("all", "", "")!;
  const newest = await stores.purchasingOS.getPage(
    { page: 1, pageSize: 0, sort: "newest" },
    range,
  );
  const oldest = await stores.purchasingOS.getPage(
    { page: 1, pageSize: 0, sort: "oldest" },
    range,
  );
  assert.deepEqual(
    newest.rows.map((row) => row.id),
    oldest.rows.map((row) => row.id).reverse(),
  );
  assert.equal(newest.rows[0].timestamp, 2000);
  const firstPage = await stores.purchasingOS.getPage(
    { page: 1, pageSize: 10, sort: "oldest" },
    range,
  );
  assert.deepEqual(firstPage.rows, oldest.rows.slice(0, 10));
});

test("current backups reject blank and duplicate invoices; legacy backups repair them", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, customer, product } = await catalog();
  const input = {
    contactId: customer.getId(),
    timestamp: 1000,
    reference: "",
    lines: [{ productId: product.getId(), quantity: 1, unitCost: 4 }],
  };
  await stores.purchasingOS.receive(input);
  await stores.purchasingOS.receive(input);
  const original = await new DatabaseBackupStore(stores.database).export();
  for (const reference of ["", original.tables.PURCHASES[0].reference]) {
    const backup = structuredClone(original);
    backup.tables.PURCHASES[1].reference = reference;
    const target = createDatabaseStores(`restore-${reference}`);
    await assert.rejects(
      new DatabaseBackupStore(target.database).restore(backup),
      /unique, non-empty invoice/,
    );
    backup.databaseVersion = 8;
    await new DatabaseBackupStore(target.database).restore(backup);
    const restored = await new DatabaseBackupStore(target.database).export();
    assert.equal(
      new Set(restored.tables.PURCHASES.map((row) => row.reference)).size,
      2,
    );
    assert.ok(
      restored.tables.PURCHASES.every((row) => String(row.reference).trim()),
    );
  }
  const database = await stores.database.getDatabase();
  assert.equal(
    database
      .transaction("PURCHASES")
      .objectStore("PURCHASES")
      .index("reference").unique,
    true,
  );
});

test("purchase payments match supplier and invoice, exclude deleted payments, and paginate", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, customer } = await catalog();
  const { default: Contact } = await import("../src/models/Contact");
  await stores.contactOS.addOne(
    new Contact({ id: "other", name: "Other Supplier", phoneNumber: "" }),
  );
  await stores.purchasingOS.pay(customer.getId(), 3, 1000, "  PUR-MATCH  ");
  await stores.purchasingOS.pay(customer.getId(), 4, 2000, "PUR-MATCH");
  await stores.purchasingOS.pay(customer.getId(), 9, 3000, "PUR-OTHER");
  await stores.purchasingOS.pay("other", 8, 4000, "PUR-MATCH");
  const newest = await stores.purchasingOS.getPurchasePayments(
    customer.getId(),
    "PUR-MATCH",
    { page: 1, pageSize: 10, sort: "newest" },
  );
  assert.deepEqual(
    newest.rows.map((row) => row.amount),
    [4, 3],
  );
  assert.equal(newest.total, 2);
  const oldest = await stores.purchasingOS.getPurchasePayments(
    customer.getId(),
    "PUR-MATCH",
    { page: 1, pageSize: 0, sort: "oldest" },
  );
  assert.deepEqual(
    oldest.rows.map((row) => row.amount),
    [3, 4],
  );
  const { putRaw } = await import("./helpers/fixtures");
  await putRaw(stores, "SUPPLIER_PAYMENTS", {
    ...newest.rows[0],
    deletedAt: 5000,
  });
  const remaining = await stores.purchasingOS.getPurchasePayments(
    customer.getId(),
    "PUR-MATCH",
    { page: 1, pageSize: 10, sort: "newest" },
  );
  assert.equal(remaining.total, 1);
  assert.equal(remaining.rows[0].amount, 3);
});
