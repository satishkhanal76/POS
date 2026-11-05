import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBObjectStore } from 'fake-indexeddb';
import { workspaceController } from '../src/controllers/WorkspaceController';
import { createDatabaseStores } from '../src/database/DatabaseStores';
import DatabaseBackupStore, { validateBackup } from '../src/database/DatabaseBackup';
import PriceHistoryController from '../src/controllers/PriceHistoryController';
import { DEMO_SALE_COUNT } from '../src/data/demoData';
import { resetEnvironment } from './helpers/environment';

beforeEach(resetEnvironment);
async function freshDemo() {
  await workspaceController.resetDemo(true);
  return createDatabaseStores('POS_DEMO');
}

test('fresh demo fills every table and supplies multiple pages of posted sales', async () => {
  const stores = await freshDemo();
  const backup = await new DatabaseBackupStore(stores.database).export();
  validateBackup(backup);
  assert.ok(Object.values(backup.tables).every(rows => rows.length > 0));
  const page = await stores.transactionsOS.getPage({ page: 1, pageSize: 10, sort: 'newest' });
  assert.equal(page.total, DEMO_SALE_COUNT);
  assert.equal(page.rows.length, 10);
  assert.equal((await stores.transactionsOS.getOne(page.rows[0].id)).isPosted(), true);
});
test('all posted demo totals reconstruct correctly with historical prices and discounts', async () => {
  const stores = await freshDemo();
  const backup = await new DatabaseBackupStore(stores.database).export();
  for (const header of backup.tables.TRANSACTIONS) {
    const transaction = await stores.transactionsOS.getOne(String(header.id));
    assert.ok(Math.abs(transaction.getTotal() - Number(header.total)) < 1e-9, `Correct reconstructed total for ${header.id}`);
    assert.ok(transaction.hasItems());
  }
  assert.deepEqual(backup.tables.DISCOUNTS.map(row => row.discountType).sort(), [0, 1]);
});
test('demo sales span both sides of price changes and keep original amounts intact', async () => {
  const stores = await freshDemo();
  assert.equal((await stores.transactionsOS.getOne('demo-sale-1')).getTotal(), 11.25);
  assert.equal((await stores.transactionsOS.getOne('demo-sale-24')).getTotal(), 9.25);
  const coffee = await stores.itemOS.getOne('demo-coffee');
  assert.equal(coffee.getOriginalAmount(), 3.5);
  assert.equal(coffee.getAmount(), 4);
  const history = await new PriceHistoryController(stores.itemOS, stores.itemPriceChangesOS).getHistory();
  assert.equal(history.length, 6);
  assert.ok(history.some(row => row.amount < row.previousAmount), 'Includes a price decrease as well as increases');
});
test('every demo customer has a scoped history and exact lifetime summary', async () => {
  const stores = await freshDemo();
  const summaries = await stores.customerSummariesOS.getPage({ page: 1, pageSize: 10, sort: 'newest' });
  assert.equal(summaries.total, 3);
  let linked = 0;
  for (const row of summaries.rows) {
    const history = await stores.cutomersTransactionsOS.getPage(row.data.id, { page: 1, pageSize: 100, sort: 'newest' });
    assert.equal(history.total, 6);
    assert.equal(row.data.count, history.total);
    assert.ok(Math.abs(row.data.total - history.rows.reduce((sum, sale) => sum + sale.total, 0)) < 1e-9);
    linked += history.total;
  }
  assert.equal(linked, 18);
  assert.ok(linked < DEMO_SALE_COUNT, 'The remainder are walk-in sales');
});
test('demo dates stay relative to the fresh-demo date and are never in the future', async context => {
  const now = Date.UTC(2026, 10, 5, 12);
  context.mock.method(Date, 'now', () => now);
  const stores = await freshDemo();
  const backup = await new DatabaseBackupStore(stores.database).export();
  for (const table of ['TRANSACTIONS', 'ITEM_PRICE_CHANGES', 'CUSTOMERS_TRANSACTIONS']) {
    assert.ok(backup.tables[table].every(row => Number(row.timestamp) < now && Number(row.timestamp) >= now - 14 * 86400000));
  }
});
test('a synchronous demo-seed failure rolls back all clears and partial writes', async context => {
  const stores = await freshDemo();
  const backupStore = new DatabaseBackupStore(stores.database);
  const before = await backupStore.export();
  const original = IDBObjectStore.prototype.add;
  context.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    if (this.name === 'TRANSACTIONS') throw new Error('Simulated seed failure');
    return original.call(this, value, key);
  });
  await assert.rejects(() => workspaceController.resetDemo(true));
  assert.deepEqual((await backupStore.export()).tables, before.tables);
});
