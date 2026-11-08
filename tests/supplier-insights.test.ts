import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { IDBObjectStore, IDBIndex } from "fake-indexeddb";
import { catalog } from "./helpers/fixtures";
import { resetEnvironment } from "./helpers/environment";
import { STORAGE_KEY } from "../src/settings/settings";
import Contact from "../src/models/Contact";
import SupplierInsightsStore from "../src/database/SupplierInsightsStore";
import SupplierInsightsController from "../src/controllers/SupplierInsightsController";
import PrintReportsController from "../src/controllers/PrintReportsController";
import DeletionStore from "../src/database/DeletionStore";

beforeEach(resetEnvironment);
const range = { start: 10000, end: 15000 };
async function fixture() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, product, customer } = await catalog();
  await stores.contactOS.addMany([
    new Contact({ id: "b", name: "Big Supplier", phoneNumber: "" }),
    new Contact({ id: "c", name: "Settled Supplier", phoneNumber: "" }),
    new Contact({ id: "d", name: "Credit Supplier", phoneNumber: "" }),
  ]);
  const buy = (
    id: string,
    timestamp: number,
    cost: number,
    reference: string,
  ) =>
    stores.purchasingOS.receive({
      contactId: id,
      timestamp,
      reference,
      lines: [{ productId: product.getId(), quantity: 1, unitCost: cost }],
    });
  await buy(customer.getId(), 1000, 100, "OLD");
  const purchase = await buy(customer.getId(), 11000, 20, "SELECTED");
  await stores.purchasingOS.pay(customer.getId(), 30, 12000, "OLD");
  await buy("b", 13000, 60, "BIG");
  await stores.purchasingOS.pay("b", 10, 20000, "BIG");
  await buy("c", 1000, 9, "SETTLED");
  await stores.purchasingOS.pay("c", 9, 2000, "SETTLED");
  await stores.purchasingOS.pay("d", 8, 13000, "CREDIT");
  const store = new SupplierInsightsStore(stores.database);
  return {
    stores,
    product,
    customer,
    purchase,
    store,
    controller: new SupplierInsightsController(store),
  };
}

test("supplier rankings follow the selected range while debt and credit use all recorded activity", async () => {
  const { controller, stores } = await fixture();
  const data = await controller.getSummary(range);
  assert.equal(data.activeSuppliers, 3);
  assert.equal(data.averagePurchase, 40);
  assert.equal(data.owed, 140);
  assert.equal(data.credit, 8);
  assert.deepEqual(
    data.topSuppliers.map((row) => row.id),
    ["b", "customer", "d"],
  );
  assert.equal(data.topSuppliers[1].payments, 30);
  assert.equal(data.topSuppliers[1].balance, 90);
  assert.equal(data.balances.find((row) => row.id === "c")?.balance, 0);
  const empty = await controller.getSummary({ start: 30000, end: 40000 });
  assert.equal(empty.topSuppliers.length, 0);
  assert.equal(empty.owed, 140);
  const report = await new PrintReportsController(stores).getReport(
    range,
    "overview",
  );
  assert.deepEqual(report.supplierInsights, data);
  assert.equal(
    (
      await new PrintReportsController(stores).getReport(
        range,
        "overview",
        false,
      )
    ).supplierInsights,
    null,
  );
});

test("supplier insights respect deletions and include zero-value purchase activity", async () => {
  const { stores, product, controller, purchase } = await fixture();
  await stores.purchasingOS.receive({
    contactId: "c",
    timestamp: 14000,
    reference: "ZERO",
    lines: [{ productId: product.getId(), quantity: 1, unitCost: 0 }],
  });
  assert.equal((await controller.getSummary(range)).activeSuppliers, 4);
  await new DeletionStore(stores.database).delete("PURCHASES", purchase);
  assert.equal((await controller.getSummary(range)).owed, 120);
  assert.equal(
    (await controller.getSummary({ ...range, includeDeleted: true })).owed,
    140,
  );
  await new DeletionStore(stores.database).delete("CUSTOMER", "b");
  assert.equal((await controller.getSummary(range)).owed, 70);
  assert.equal(
    (await controller.getSummary({ ...range, includeDeleted: true })).owed,
    140,
  );
});

test("supplier insights read keys and distinct contacts without hydrating purchase or payment records", async (context) => {
  const { store } = await fixture();
  await store.getRows(range);
  const original = IDBObjectStore.prototype.get;
  const reads: string[] = [];
  context.mock.method(
    IDBObjectStore.prototype,
    "get",
    function (this: IDBObjectStore, key: IDBValidKey) {
      assert.equal(this.name, "CUSTOMER");
      reads.push(String(key));
      return original.call(this, key);
    },
  );
  context.mock.method(IDBObjectStore.prototype, "getAll", () => {
    throw new Error("Unexpected full-store read");
  });
  context.mock.method(IDBIndex.prototype, "getAll", () => {
    throw new Error("Unexpected full-index read");
  });
  const rows = await store.getRows(range);
  assert.equal(rows.length, 4);
  assert.equal(reads.length, 4);
});
