import { beforeEach, test, TestContext } from "node:test";
import assert from "node:assert/strict";
import { IDBObjectStore, IDBIndex } from "fake-indexeddb";
import { resetEnvironment, requestResult } from "./helpers/environment";
import { catalog, historyFixture, sale } from "./helpers/fixtures";
import TransactionHistoryStore from "../src/database/TransactionHistoryStore";
import { dashboardRange } from "../src/dashboard/period";
import { PageSort } from "../src/database/Pagination";
import { STORAGE_KEY } from "../src/settings/settings";
import DeletionStore from "../src/database/DeletionStore";
import CustomerActivityStore from "../src/database/CustomerActivityStore";
import Customer from "../src/models/Customer";
import ProductItem from "../src/models/ProductItem";
import Transaction from "../src/models/Transaction";
import DatabaseBackupStore from "../src/database/DatabaseBackup";
import { createDatabaseStores } from "../src/database/DatabaseStores";

beforeEach(resetEnvironment);
const all = dashboardRange("all", "", "")!;
const options = { page: 1, pageSize: 10, sort: "newest" as const };

function recordReads(context: TestContext) {
  const original = IDBObjectStore.prototype.get;
  const reads: string[] = [];
  context.mock.method(
    IDBObjectStore.prototype,
    "get",
    function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      reads.push(`${this.name}/${String(key)}`);
      return original.call(this, key);
    },
  );
  context.mock.method(IDBObjectStore.prototype, "getAll", () => {
    throw new Error("Whole-store reads are forbidden for paginated lists");
  });
  context.mock.method(IDBIndex.prototype, "getAll", () => {
    throw new Error("Whole-index reads are forbidden for paginated lists");
  });
  return reads;
}

test("all transaction sorts and filters read only visible records", async (context) => {
  const { stores } = await historyFixture();
  const store = new TransactionHistoryStore(stores.database);
  const reads = recordReads(context);
  for (const sort of [
    "newest",
    "oldest",
    "total-high",
    "total-low",
    "items-high",
    "items-low",
  ] as PageSort[]) {
    for (const range of [all, { start: 1005, end: 1029 }]) {
      reads.length = 0;
      const result = await store.getPage(
        { ...options, page: 2, sort },
        range,
        "sale",
      );
      assert.equal(result.rows.length, 10);
      assert.equal(
        reads.filter((read) => read.startsWith("TRANSACTIONS/")).length,
        10,
      );
      assert.ok(
        result.rows.every(
          (row) =>
            row.timestamp >= range.start &&
            (range.all || row.timestamp < range.end),
        ),
      );
    }
    reads.length = 0;
    const linked = await store.getPage({ ...options, sort }, all, "sale", "c0");
    assert.equal(linked.total, 3);
    assert.equal(
      reads.filter((read) => read.startsWith("TRANSACTIONS/")).length,
      3,
    );
  }
});

test("merged purchasing pages, type filters, invoice matches and balances avoid unbounded reads", async (context) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const { stores, customer, product } = await catalog();
  for (let index = 0; index < 25; index++) {
    await stores.purchasingOS.receive({
      contactId: customer.getId(),
      timestamp: 1000 + index * 2,
      reference: `INV-${index}`,
      lines: [{ productId: product.getId(), quantity: 1, unitCost: index + 1 }],
    });
    await stores.purchasingOS.pay(
      customer.getId(),
      index + 2,
      1001 + index * 2,
      `INV-${index}`,
    );
  }
  const reads = recordReads(context);
  for (const sort of [
    "newest",
    "oldest",
    "total-high",
    "total-low",
  ] as PageSort[]) {
    for (const range of [all, { start: 1010, end: 1040 }]) {
      reads.length = 0;
      const result = await stores.purchasingOS.getPage(
        { ...options, page: 2, sort },
        range,
      );
      assert.equal(result.rows.length, 10);
      assert.equal(result.total, range.all ? 50 : 30);
      assert.equal(reads.length, 10);
      assert.equal(new Set(result.rows.map((row) => row.id)).size, 10);
      if (sort.startsWith("total-"))
        assert.ok(
          result.rows.every(
            (row, index) =>
              !index ||
              (sort === "total-high"
                ? Math.abs(row.total) <= Math.abs(result.rows[index - 1].total)
                : Math.abs(row.total) >=
                  Math.abs(result.rows[index - 1].total)),
          ),
        );
    }
  }
  reads.length = 0;
  const payments = await stores.purchasingOS.getPage(
    options,
    all,
    customer.getId(),
    "supplier-payment",
  );
  assert.equal(payments.total, 25);
  assert.equal(reads.length, 10);
  reads.length = 0;
  const invoice = await stores.purchasingOS.getPurchasePayments(
    customer.getId(),
    "INV-10",
    options,
  );
  assert.equal(invoice.total, 1);
  assert.equal(reads.length, 1);
  reads.length = 0;
  assert.equal(await stores.purchasingOS.balance(customer.getId()), -25);
  assert.equal(reads.length, 0);
});

test("catalog searches read only their page and edits/deletion update keys", async (context) => {
  const { stores } = await catalog();
  await stores.contactOS.addMany(
    Array.from(
      { length: 35 },
      (_, index) =>
        new Customer({
          id: `c${index}`,
          name: `Contact ${String(index).padStart(2, "0")}`,
          phoneNumber: `555-${index}`,
        }),
    ),
  );
  await stores.itemOS.addMany(
    Array.from(
      { length: 35 },
      (_, index) =>
        new ProductItem({
          id: `p${index}`,
          name: `Item ${String(index).padStart(2, "0")}`,
          amount: 2,
        }),
    ),
  );
  await stores.contactOS.updateOne(
    new Customer({ id: "c0", name: "Renamed Contact", phoneNumber: "555-0" }),
  );
  await stores.itemOS.updateDetails("p0", "Renamed Item", 3);
  await new DeletionStore(stores.database).delete("PRODUCTS", "p1");
  const reads = recordReads(context);
  const contacts = await stores.contactOS.getCatalogPage(
    { ...options, page: 2 },
    "555-",
  );
  assert.equal(contacts.total, 36);
  assert.equal(contacts.rows.length, 10);
  assert.equal(reads.filter((read) => read.startsWith("CUSTOMER/")).length, 10);
  reads.length = 0;
  const items = await stores.itemOS.getCatalogPage(options, "ITEM");
  assert.equal(items.total, 34);
  assert.equal(reads.filter((read) => read.startsWith("PRODUCTS/")).length, 10);
  assert.equal(
    (await stores.itemOS.getCatalogPage(options, "renamed")).rows[0].getName(),
    "Renamed Item",
  );
  assert.equal(
    (
      await stores.contactOS.getCatalogPage(options, "renamed")
    ).rows[0].getName(),
    "Renamed Contact",
  );
  assert.equal(
    (
      await stores.itemOS.getCatalogPage(
        { ...options, includeDeleted: true },
        "item",
      )
    ).total,
    35,
  );
});

test("price history pages preserve preceding prices across page boundaries and deletion", async (context) => {
  const { stores, product } = await catalog();
  for (let price = 6; price <= 25; price++)
    await stores.itemOS.updateDetails(product.getId(), "Coffee", price);
  const reads = recordReads(context);
  const page = await stores.itemPriceChangesOS.getHistoryPage(
    { ...options, page: 2 },
    product.getId(),
  );
  assert.equal(page.total, 20);
  assert.equal(page.rows[0].amount, 15);
  assert.equal(page.rows[0].previousAmount, 14);
  assert.equal(page.rows[9].amount, 6);
  assert.equal(page.rows[9].previousAmount, 5);
  assert.equal(
    reads.filter((read) => read.startsWith("ITEM_PRICE_CHANGES/")).length,
    10,
  );
  assert.equal(reads.filter((read) => read.startsWith("PRODUCTS/")).length, 10);
  context.mock.restoreAll();
  await new DeletionStore(stores.database).delete("PRODUCTS", product.getId());
  assert.equal(
    (await stores.itemPriceChangesOS.getHistoryPage(options)).total,
    0,
  );
  const history = await stores.itemPriceChangesOS.getHistoryPage({
    ...options,
    includeDeleted: true,
  });
  assert.equal(history.total, 20);
  assert.ok(history.rows.every((row) => row.deletedAt));
});

test("link/unlink, customer payments, deletion and restore keep all query projections consistent", async () => {
  const { stores, product, customer } = await catalog();
  const transaction = await sale(stores, product, "sale", 1000, customer);
  const history = new TransactionHistoryStore(stores.database),
    activity = new CustomerActivityStore(stores.database);
  assert.equal(
    (await history.getPage(options, all, "sale", customer.getId())).total,
    1,
  );
  const payment = new Transaction("payment", 2000, 2);
  await stores.cutomersTransactionsOS.recordPayment(payment, customer);
  assert.equal(
    (await history.getPage(options, all, "payment", customer.getId())).total,
    1,
  );
  assert.equal(await activity.getBalance(customer.getId()), 3);
  await stores.cutomersTransactionsOS.unlinkTransaction(
    transaction.getId(),
    customer.getId(),
  );
  assert.equal(
    (await history.getPage(options, all, "sale", customer.getId())).total,
    0,
  );
  assert.equal(await activity.getBalance(customer.getId(), true), -2);
  await new DeletionStore(stores.database).delete(
    "TRANSACTIONS",
    payment.getId(),
  );
  assert.equal((await history.getPage(options, all, "payment")).total, 0);
  assert.equal(
    (
      await history.getPage(
        { ...options, includeDeleted: true },
        all,
        "payment",
      )
    ).total,
    1,
  );
  assert.equal(await activity.getBalance(customer.getId()), 0);
  assert.equal(await activity.getBalance(customer.getId(), true), -2);
  assert.equal((await stores.customerSummariesOS.getPage(options)).total, 0);
  const historical = await stores.customerSummariesOS.getPage({
    ...options,
    includeDeleted: true,
  });
  assert.equal(historical.rows[0].data.total, -2);
  const backup = await new DatabaseBackupStore(stores.database).export();
  assert.ok(backup.tables.TRANSACTIONS.every((row) => !("listDate" in row)));
  const target = createDatabaseStores("restored-indexes");
  await new DatabaseBackupStore(target.database).restore(backup);
  assert.equal(
    (
      await new TransactionHistoryStore(target.database).getPage(
        { ...options, includeDeleted: true },
        all,
        "payment",
        customer.getId(),
      )
    ).total,
    1,
  );
  assert.equal((await target.itemOS.getCatalogPage(options)).total, 1);
});

test("version-10 records backfill listing keys without changing canonical data", async () => {
  const { stores, customer, product } = await catalog("source");
  await sale(stores, product, "sale", 1000, customer);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  const backup = await new DatabaseBackupStore(stores.database).export();
  const source = await stores.database.getDatabase();
  const structures = [...source.objectStoreNames].map((name) => {
    const store = source.transaction(name).objectStore(name);
    return {
      name,
      keyPath: store.keyPath,
      indexes: [...store.indexNames]
        .filter(
          (key) =>
            !key.startsWith("list") &&
            key !== "catalogKeys" &&
            key !== "activeLink",
        )
        .map((name) => {
          const index = store.index(name);
          return {
            name,
            keyPath: index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry,
          };
        }),
    };
  });
  const request = indexedDB.open("old-v10", 10);
  request.onupgradeneeded = () => {
    for (const definition of structures) {
      const store = request.result.createObjectStore(definition.name, {
        keyPath: definition.keyPath,
      });
      for (const index of definition.indexes)
        store.createIndex(index.name, index.keyPath, {
          unique: index.unique,
          multiEntry: index.multiEntry,
        });
      for (const row of backup.tables[definition.name]) store.add(row);
    }
  };
  const previous = await requestResult(request);
  previous.close();
  const upgraded = createDatabaseStores("old-v10");
  const result = await new TransactionHistoryStore(upgraded.database).getPage(
    { ...options, sort: "items-high" },
    all,
    "sale",
    customer.getId(),
  );
  assert.equal(result.rows[0].id, "sale");
  assert.equal(result.rows[0].listItemCount, 1);
  assert.equal(
    (await upgraded.itemOS.getCatalogPage(options)).rows[0].getAmount(),
    7,
  );
  assert.equal(
    (await upgraded.itemPriceChangesOS.getHistoryPage(options)).rows[0]
      .previousAmount,
    5,
  );
  assert.equal(
    (await upgraded.customerSummariesOS.getPage(options)).rows[0].data.total,
    5,
  );
  const actual = await new DatabaseBackupStore(upgraded.database).export();
  assert.deepEqual(actual.tables, backup.tables);
});

test('customer balance projections use keys and retain historical inclusion semantics', async context => {
    const { stores, product, customer } = await catalog();
    await sale(stores, product, 'sale', 1000, customer);
    await stores.cutomersTransactionsOS.recordPayment(new Transaction('payment', 2000, 2), customer);
    await new DeletionStore(stores.database).delete('TRANSACTIONS', 'sale');
    const reads = recordReads(context);
    const activity = new CustomerActivityStore(stores.database);
    const active = await activity.list();
    assert.equal(active[0].total, -2);
    assert.equal(active[0].name, 'Alex');
    assert.equal(active[0].phoneNumber, '555-0101');
    const historical = await activity.list(true);
    assert.equal(historical[0].total, 3);
    assert.equal(historical[0].count, 2);
    assert.equal(historical[0].timestamp, 2000);
    assert.equal(reads.length, 0);
});

test('dashboard scans period keys, reuses products and preserves historical prices', async context => {
    const { default: DashboardOS } = await import('../src/database/DashboardOS');
    const { default: DashboardController } = await import('../src/controllers/DashboardController');
    const { default: ItemPriceChange } = await import('../src/models/ItemPriceChange');
    const { stores, product, customer } = await catalog();
    await sale(stores, product, 'old', 1000, customer);
    await stores.itemPriceChangesOS.addOne(new ItemPriceChange({ id: 'new-price', itemId: product.getId(), timestamp: 1500, amount: 7 }));
    await sale(stores, await stores.itemOS.getOne(product.getId()), 'new', 2000, customer);
    await stores.cutomersTransactionsOS.recordPayment(new Transaction('payment', 3000, 3), customer);
    const original = IDBObjectStore.prototype.get;
    const reads: string[] = [];
    context.mock.method(IDBObjectStore.prototype, 'get', function(this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
        reads.push(this.name); return original.call(this, key);
    });
    const controller = new DashboardController(new DashboardOS(stores.database));
    const report = await controller.getSummary(all);
    assert.equal(report.sales, 12);
    assert.equal(report.payments, 3);
    assert.equal(report.salesCount, 2);
    assert.equal(report.topItems[0].gross, 12);
    assert.equal(report.topItems[0].quantity, 2);
    assert.equal(reads.filter(name => name === 'PRODUCTS').length, 1);
    assert.equal(reads.filter(name => name === 'TRANSACTIONS').length, 0);
    const early = await controller.getSummary({ start: 1000, end: 1500 });
    assert.equal(early.sales, 5);
    assert.equal(early.payments, 0);
    assert.equal(early.topItems[0].gross, 5);
    context.mock.restoreAll();
    await new DeletionStore(stores.database).delete('TRANSACTIONS', 'old');
    assert.equal((await controller.getSummary(all)).sales, 7);
    const historical = await new DashboardOS(stores.database).getEntries({ ...all, includeDeleted: true });
    assert.equal(historical.length, 3);
    assert.ok(historical.find(row => row.id === 'old')?.deletedAt);
    assert.equal(controller.summarize(historical, all).sales, 12);
});
