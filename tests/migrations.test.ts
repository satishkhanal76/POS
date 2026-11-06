import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import DatabaseBackupStore, { validateBackup } from '../src/database/DatabaseBackup';
import { createDatabaseStores } from '../src/database/DatabaseStores';
import { resetEnvironment } from './helpers/environment';
import { legacyDatabase } from './helpers/fixtures';

beforeEach(resetEnvironment);
for (const version of [1, 2] as const) {
  test(`version ${version} upgrades in place, preserving records and rebuilding summaries`, async () => {
    const stores = await legacyDatabase(version);
    const database = await stores.database.getDatabase();
    assert.equal(database.version, 4);
    assert.equal((await stores.transactionsOS.getOne('old')).getTotal(), 6);
    assert.equal((await stores.itemOS.getOne('p')).getAmount(), version === 2 ? 5 : 3);
    const summaries = await stores.customerSummariesOS.getPage({ page: 1, pageSize: 10, sort: 'newest' });
    assert.equal(summaries.rows[0].data.count, version === 2 ? 2 : 1);
    assert.equal(summaries.rows[0].data.total, version === 2 ? 16 : 6);
    assert.ok(database.transaction('CUSTOMERS_TRANSACTIONS').objectStore('CUSTOMERS_TRANSACTIONS').indexNames.contains('customerTimestamp'));
    validateBackup(await new DatabaseBackupStore(stores.database).export());
  });
}
test('fresh databases have every registered store and the current indexes', async () => {
  const stores = createDatabaseStores('fresh');
  const database = await stores.database.getDatabase();
  assert.equal(database.objectStoreNames.length, 10);
  assert.ok(database.objectStoreNames.contains('STOCK'));
  assert.ok(database.objectStoreNames.contains('ITEM_PRICE_CHANGES'));
  assert.ok(database.objectStoreNames.contains('CUSTOMER_TRANSACTION_SUMMARIES'));
});
test('concurrent callers share the same database connection', async () => {
  const stores = createDatabaseStores('concurrent');
  const databases = await Promise.all(Array.from({ length: 8 }, () => stores.database.getDatabase()));
  assert.ok(databases.every(database => database === databases[0]));
});
