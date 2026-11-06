import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { resetEnvironment } from "./helpers/environment";
import { catalog, putRaw } from "./helpers/fixtures";
import TransactionHistoryStore from "../src/database/TransactionHistoryStore";
import { dashboardRange } from "../src/dashboard/period";
import { STORAGE_KEY } from "../src/settings/settings";

beforeEach(resetEnvironment);
test("transaction amount and item sorts apply before pagination and respect kind/customer/date/deletion", async () => {
  const { stores, customer, product } = await catalog();
  for (let index = 0; index < 15; index++) {
    await putRaw(stores, "TRANSACTIONS", {
      id: `t${index}`,
      timestamp: index + 1000,
      total: index + 1,
    });
    for (let item = 0; item < index; item++)
      await putRaw(stores, "TRANSACTION_PRODUCTS", {
        id: `p${index}-${item}`,
        transactionId: `t${index}`,
        productId: product.getId(),
        quantity: 1,
      });
  }
  await putRaw(stores, "TRANSACTIONS", {
    id: "payment",
    timestamp: 2000,
    total: -100,
    kind: "payment",
  });
  await putRaw(stores, "TRANSACTIONS", {
    id: "deleted",
    timestamp: 3000,
    total: 1000,
    deletedAt: 3001,
  });
  await putRaw(stores, "CUSTOMERS_TRANSACTIONS", {
    id: "link",
    transactionId: "t12",
    customerId: customer.getId(),
    timestamp: 1012,
  });
  const store = new TransactionHistoryStore(stores.database),
    range = dashboardRange("all", "", "")!;
  const high = await store.getPage(
    { page: 1, pageSize: 10, sort: "total-high" },
    range,
  );
  assert.equal(high.total, 16);
  assert.deepEqual(
    high.rows.slice(0, 3).map((row) => row.id),
    ["payment", "t14", "t13"],
  );
  const sales = await store.getPage(
    { page: 2, pageSize: 10, sort: "items-high" },
    range,
    "sale",
  );
  assert.deepEqual(
    sales.rows.map((row) => row.id),
    ["t4", "t3", "t2", "t1", "t0"],
  );
  const low = await store.getPage(
    { page: 1, pageSize: 10, sort: "items-low" },
    range,
    "sale",
  );
  assert.equal(low.rows[0].id, "t0");
  const linked = await store.getPage(
    { page: 1, pageSize: 10, sort: "total-low" },
    range,
    "sale",
    customer.getId(),
  );
  assert.deepEqual(
    linked.rows.map((row) => row.id),
    ["t12"],
  );
  const payments = await store.getPage(
    { page: 1, pageSize: 10, sort: "total-low" },
    range,
    "payment",
  );
  assert.deepEqual(
    payments.rows.map((row) => row.id),
    ["payment"],
  );
  const dated = await store.getPage(
    { page: 1, pageSize: 10, sort: "total-high" },
    { start: 1000, end: 1003 },
  );
  assert.deepEqual(
    dated.rows.map((row) => row.id),
    ["t2", "t1", "t0"],
  );
});

test("purchasing kind filters and amount sorting work together", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, customer, product } = await catalog();
  const input = {
    contactId: customer.getId(),
    timestamp: 1000,
    reference: "",
    lines: [{ productId: product.getId(), quantity: 1, unitCost: 4 }],
  };
  await stores.purchasingOS.receive(input);
  await stores.purchasingOS.receive({
    ...input,
    lines: [{ ...input.lines[0], unitCost: 20 }],
  });
  await stores.purchasingOS.pay(customer.getId(), 12, 2000, "test");
  const range = dashboardRange("all", "", "")!;
  const options = { page: 1, pageSize: 10, sort: "total-high" as const };
  const all = await stores.purchasingOS.getPage(options, range);
  assert.deepEqual(
    all.rows.map((row) => Math.abs(row.total)),
    [20, 12, 4],
  );
  const purchases = await stores.purchasingOS.getPage(
    options,
    range,
    undefined,
    "purchase",
  );
  assert.deepEqual(
    purchases.rows.map((row) => row.total),
    [20, 4],
  );
  const payments = await stores.purchasingOS.getPage(
    options,
    range,
    undefined,
    "supplier-payment",
  );
  assert.deepEqual(
    payments.rows.map((row) => row.total),
    [-12],
  );
});

test("all-time date paging reads only visible headers, with exact totals and soft deletions", async (context) => {
  const { stores } = await catalog();
  for (let index = 0; index < 40; index++)
    await putRaw(stores, "TRANSACTIONS", {
      id: `r${index}`,
      timestamp: 1000 + index,
      total: 1,
      ...(index % 5 === 0 ? { deletedAt: 5000 } : {}),
    });
  const { IDBObjectStore } = await import("fake-indexeddb");
  const original = IDBObjectStore.prototype.get;
  const loaded: IDBValidKey[] = [];
  context.mock.method(
    IDBObjectStore.prototype,
    "get",
    function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      if (this.name === "TRANSACTIONS") loaded.push(key as IDBValidKey);
      return original.call(this, key);
    },
  );
  const store = new TransactionHistoryStore(stores.database),
    range = dashboardRange("all", "", "")!;
  const options = { page: 1, pageSize: 10, sort: "newest" as const };
  const first = await store.getPage(options, range);
  assert.equal(first.total, 32);
  assert.equal(first.rows.length, 10);
  assert.equal(loaded.length, 10);
  assert.ok(first.rows.every((row) => !row.deletedAt));
  loaded.length = 0;
  const second = await store.getPage({ ...options, page: 2 }, range);
  assert.equal(loaded.length, 10);
  assert.equal(second.rows.length, 10);
  assert.ok(
    second.rows.every(
      (row) => !first.rows.some((previous) => previous.id === row.id),
    ),
  );
  const withDeleted = await store.getPage(
    { ...options, includeDeleted: true },
    range,
  );
  assert.equal(withDeleted.total, 40);
  assert.ok(withDeleted.rows.some((row) => row.deletedAt));
  const bounded = await store.getPage(options, { start: 1000, end: 1010 });
  assert.equal(bounded.total, 8);
  assert.equal(bounded.rows.length, 8);
  const final = await store.getPage({ ...options, page: 999 }, range);
  assert.equal(final.page, 4);
  assert.equal(final.rows.length, 2);
  const all = await store.getPage({ ...options, pageSize: 0 }, range);
  assert.equal(all.rows.length, 32);
});
