import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import DatabaseBackupStore, {
  validateBackup,
} from "../src/database/DatabaseBackup";
import { createDatabaseStores } from "../src/database/DatabaseStores";
import {
  requestResult,
  resetEnvironment,
  transactionDone,
} from "./helpers/environment";
import { legacyDatabase } from "./helpers/fixtures";

beforeEach(resetEnvironment);
for (const version of [1, 2] as const) {
  test(`version ${version} upgrades in place, preserving records and rebuilding summaries`, async () => {
    const stores = await legacyDatabase(version);
    const database = await stores.database.getDatabase();
    assert.equal(database.version, 14);
    assert.equal((await stores.transactionsOS.getOne("old")).getTotal(), 6);
    assert.equal(
      (await stores.itemOS.getOne("p")).getAmount(),
      version === 2 ? 5 : 3,
    );
    const summaries = await stores.customerSummariesOS.getPage({
      page: 1,
      pageSize: 10,
      sort: "newest",
    });
    assert.equal(summaries.rows[0].data.count, version === 2 ? 2 : 1);
    assert.equal(summaries.rows[0].data.total, version === 2 ? 16 : 6);
    assert.ok(
      database
        .transaction("CUSTOMERS_TRANSACTIONS")
        .objectStore("CUSTOMERS_TRANSACTIONS")
        .indexNames.contains("customerTimestamp"),
    );
    validateBackup(await new DatabaseBackupStore(stores.database).export());
  });
}
test("fresh databases have every registered store and the current indexes", async () => {
  const stores = createDatabaseStores("fresh");
  const database = await stores.database.getDatabase();
  assert.equal(database.objectStoreNames.length, 13);
  assert.ok(database.objectStoreNames.contains("STOCK"));
  assert.ok(database.objectStoreNames.contains("ITEM_PRICE_CHANGES"));
  assert.ok(
    database.objectStoreNames.contains("CUSTOMER_TRANSACTION_SUMMARIES"),
  );
});
test("concurrent callers share the same database connection", async () => {
  const stores = createDatabaseStores("concurrent");
  const databases = await Promise.all(
    Array.from({ length: 8 }, () => stores.database.getDatabase()),
  );
  assert.ok(databases.every((database) => database === databases[0]));
});

// An earlier version-6 connection can exist without the new purchasing stores.
// Repair the schema in place rather than asking the user to reset their workspace.
for (const name of ["POS", "POS_DEMO"]) {
  test(`repairs missing purchasing stores in ${name} without losing existing records`, async () => {
    const request = indexedDB.open(name, 6);
    request.onupgradeneeded = () => {
      const products = request.result.createObjectStore("PRODUCTS", {
        keyPath: "id",
      });
      products.createIndex("id", "id", { unique: true });
      products.createIndex("name", "name");
      products.add({ id: "saved-item", name: "Saved Coffee", amount: 5 });
      const purchases = request.result.createObjectStore("PURCHASES", {
        keyPath: "id",
      });
      purchases.createIndex("id", "id", { unique: true });
      purchases.createIndex("timestamp", "timestamp");
      purchases.createIndex("contactId", "contactId");
      purchases.add({
        id: "saved-purchase",
        total: 25,
        timestamp: 1000,
        contactId: "contact",
      });
    };
    const previous = await requestResult(request);
    previous.close();
    const stores = createDatabaseStores(name);
    const database = await stores.database.getDatabase();
    assert.equal(database.version, 14);
    assert.equal(database.objectStoreNames.length, 13);
    assert.equal(
      (await stores.itemOS.getOne("saved-item")).getName(),
      "Saved Coffee",
    );
    const transaction = database.transaction("PURCHASES");
    const completed = transactionDone(transaction);
    const purchase = await requestResult(
      transaction.objectStore("PURCHASES").get("saved-purchase"),
    );
    await completed;
    assert.equal(purchase.total, 25);
    assert.ok(
      database
        .transaction("PURCHASE_LINES")
        .objectStore("PURCHASE_LINES")
        .indexNames.contains("purchaseId"),
    );
    assert.ok(
      database
        .transaction("SUPPLIER_PAYMENTS")
        .objectStore("SUPPLIER_PAYMENTS")
        .indexNames.contains("contactId"),
    );
  });
}
