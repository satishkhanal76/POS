import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { IDBObjectStore } from "fake-indexeddb";
import DatabaseBackupStore, {
  DatabaseBackup,
  validateBackup,
} from "../src/database/DatabaseBackup";
import { createDatabaseStores } from "../src/database/DatabaseStores";
import DiscountController from "../src/controllers/DiscountController";
import { DiscountItemType } from "../src/models/DiscountItem";
import CustomerTransaction from "../src/models/CustomerTransaction";
import Transaction from "../src/models/Transaction";
import { resetEnvironment } from "./helpers/environment";
import { catalog } from "./helpers/fixtures";

beforeEach(resetEnvironment);
async function populatedBackup() {
  const { stores, product, customer } = await catalog("source");
  const transaction = new Transaction("sale", 1000);
  transaction.addProductItem(product);
  await new DiscountController(stores.discountOS).apply(transaction, {
    type: DiscountItemType.FLAT,
    value: 1,
  });
  await stores.transactionsOS.postTransaction(transaction);
  await stores.cutomersTransactionsOS.addOne(
    new CustomerTransaction({
      id: "link",
      timestamp: 1010,
      transaction,
      customer,
    }),
  );
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  return {
    stores,
    backup: await new DatabaseBackupStore(stores.database).export(),
  };
}
test("full backup round trips every table, original relationship ID, and historical total", async () => {
  const { backup } = await populatedBackup();
  const target = createDatabaseStores("target");
  const store = new DatabaseBackupStore(target.database);
  await store.restore(JSON.parse(JSON.stringify(backup)));
  assert.deepEqual((await store.export()).tables, backup.tables);
  assert.equal((await target.transactionsOS.getOne("sale")).getTotal(), 4);
  assert.equal((await target.itemOS.getOne("product")).getAmount(), 7);
  assert.equal(
    (await target.cutomersTransactionsOS.getOne("link"))
      .getCustomer()
      .getName(),
    "Alex",
  );
});
for (const version of [1, 2] as const) {
  test(`version ${version} backup gains missing derived tables during restore`, async () => {
    const { backup } = await populatedBackup();
    backup.databaseVersion = version;
    delete backup.tables.CUSTOMER_TRANSACTION_SUMMARIES;
    if (version === 1) delete backup.tables.ITEM_PRICE_CHANGES;
    const target = createDatabaseStores("target");
    await new DatabaseBackupStore(target.database).restore(backup);
    const page = await target.customerSummariesOS.getPage({
      page: 1,
      pageSize: 10,
      sort: "newest",
    });
    assert.equal(page.rows[0].data.total, 4);
    assert.equal(
      (await target.itemOS.getOne("product")).getAmount(),
      version === 1 ? 5 : 7,
    );
  });
}
const corruptions: Array<[string, (backup: DatabaseBackup) => void]> = [
  [
    "missing tables",
    (backup) => {
      delete backup.tables.CUSTOMER;
    },
  ],
  [
    "broken product references",
    (backup) => {
      backup.tables.TRANSACTION_PRODUCTS[0].productId = "missing";
    },
  ],
  [
    "duplicate IDs",
    (backup) => {
      backup.tables.PRODUCTS.push(backup.tables.PRODUCTS[0]);
    },
  ],
  [
    "invalid field types",
    (backup) => {
      backup.tables.PRODUCTS[0].amount = "bad";
    },
  ],
  [
    "unsupported versions",
    (backup) => {
      backup.databaseVersion = 999;
    },
  ],
  [
    "incorrect summary totals",
    (backup) => {
      backup.tables.CUSTOMER_TRANSACTION_SUMMARIES[0].total = 999;
    },
  ],
];
for (const [description, corrupt] of corruptions) {
  test(`restore rejects ${description} and preserves the existing database`, async () => {
    const { stores, backup } = await populatedBackup();
    const invalid = structuredClone(backup);
    corrupt(invalid);
    const store = new DatabaseBackupStore(stores.database);
    await assert.rejects(() => store.restore(invalid));
    assert.deepEqual((await store.export()).tables, backup.tables);
  });
}
test("a write failure rolls back clears and writes across every restored table", async (context) => {
  const { stores, backup } = await populatedBackup();
  const original = IDBObjectStore.prototype.add;
  context.mock.method(
    IDBObjectStore.prototype,
    "add",
    function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === "PRODUCTS") throw new Error("Simulated write failure");
      return original.call(this, value, key);
    },
  );
  const store = new DatabaseBackupStore(stores.database);
  await assert.rejects(() => store.restore(backup));
  assert.deepEqual((await store.export()).tables, backup.tables);
});
test("demo restoration cannot replace real workspace data", async () => {
  const { stores, backup } = await populatedBackup();
  const target = createDatabaseStores("POS_DEMO");
  await new DatabaseBackupStore(target.database).restore(backup);
  assert.deepEqual(
    (await new DatabaseBackupStore(stores.database).export()).tables,
    backup.tables,
  );
  validateBackup(await new DatabaseBackupStore(target.database).export());
});
