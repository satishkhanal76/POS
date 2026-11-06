import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBObjectStore } from 'fake-indexeddb';
import { catalog } from './helpers/fixtures';
import { resetEnvironment, requestResult } from './helpers/environment';
import { createDatabaseStores } from '../src/database/DatabaseStores';
import DatabaseBackupStore from '../src/database/DatabaseBackup';
import TransactionHistoryStore from '../src/database/TransactionHistoryStore';
import { ensureListings, databaseProgress, MAINTENANCE_EVENT } from '../src/database/listing/maintenance';
import { LISTING_VERSION } from '../src/database/listing/metadata';

beforeEach(resetEnvironment);
const options = { page: 1, pageSize: 10, sort: 'newest' as const };
const all = { start: 0, end: Number.MAX_SAFE_INTEGER, all: true };

async function existingWorkspace(name: string, count = 350, keepOpen = false) {
    const { stores } = await catalog('source');
    const backup = await new DatabaseBackupStore(stores.database).export();
    const source = await stores.database.getDatabase();
    const definitions = [...source.objectStoreNames].map(name => {
        const store = source.transaction(name).objectStore(name);
        return { name, keyPath: store.keyPath, indexes: [...store.indexNames].map(name => { const index = store.index(name); return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }; }) };
    });
    const request = indexedDB.open(name, 13);
    request.onupgradeneeded = () => {
        for (const definition of definitions) {
            const store = request.result.createObjectStore(definition.name, { keyPath: definition.keyPath });
            for (const index of definition.indexes) store.createIndex(index.name, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry });
            for (const row of backup.tables[definition.name]) store.add(row);
        }
        const transaction = request.transaction!;
        for (let index = 0; index < count; index++) {
            transaction.objectStore('TRANSACTIONS').add({ id: String(index).padStart(6, '0'), timestamp: 1000 + index, total: 5 });
            transaction.objectStore('TRANSACTION_PRODUCTS').add({ id: `line-${index}`, transactionId: String(index).padStart(6, '0'), productId: 'product', quantity: 1 });
        }
    };
    const previous = await requestResult(request);
    if (!keepOpen) previous.close();
    return { stores: createDatabaseStores(name), previous };
}

test('opening an existing workspace does not rewrite history; latest ten and catalogs load without its indexes', async context => {
    const { stores } = await existingWorkspace('POS', 1500);
    const update = IDBObjectStore.prototype.put;
    const writes: string[] = [];
    context.mock.method(IDBObjectStore.prototype, 'put', function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) { writes.push(this.name); return update.call(this, value, key); });
    const database = await stores.database.getDatabase();
    assert.deepEqual(writes, []);
    const rows = await new TransactionHistoryStore(stores.database).getPage(options, all);
    assert.equal(rows.total, 1500);
    assert.equal(rows.rows.length, 10);
    assert.equal(rows.rows[0].timestamp, 2499);
    assert.equal(rows.rows[0].listItemCount, undefined);
    assert.deepEqual(writes, []);
    assert.equal(localStorage.getItem('pos.indexing.POS.TRANSACTIONS'), null);
    assert.equal((await stores.itemOS.getCatalogPage(options)).total, 1);
    assert.equal((await stores.contactOS.getCatalogPage(options)).total, 1);
    assert.equal(localStorage.getItem('pos.indexing.POS.TRANSACTIONS'), null);
    const backup = await new DatabaseBackupStore(stores.database).export();
    assert.equal(backup.tables.TRANSACTIONS.length, 1500);
    assert.ok(backup.tables.TRANSACTIONS.every(row => !('listVersion' in row)));
    assert.equal(database.version, 14);
});

test('history preparation yields between batches and resumes after an interrupted connection', async () => {
    const { stores } = await existingWorkspace('resumable');
    const database = await stores.database.getDatabase();
    let interrupted = false;
    const stop = () => {
        const state = databaseProgress(database.name);
        if (!interrupted && state?.table === 'TRANSACTIONS' && state.completed >= 100 && !state.failed) {
            interrupted = true;
            database.close();
        }
    };
    window.addEventListener(MAINTENANCE_EVENT, stop);
    await assert.rejects(ensureListings(database, ['TRANSACTIONS']));
    window.removeEventListener(MAINTENANCE_EVENT, stop);
    const saved = JSON.parse(localStorage.getItem('pos.indexing.resumable.TRANSACTIONS')!);
    assert.equal(saved.version, LISTING_VERSION);
    assert.equal(saved.completed, 100);
    assert.equal(saved.done, false);
    const resumed = createDatabaseStores('resumable');
    const current = await resumed.database.getDatabase();
    const milestones: number[] = [];
    const listener = () => { const state = databaseProgress(current.name); if (state?.table === 'TRANSACTIONS' && !state.failed) milestones.push(state.completed); };
    window.addEventListener(MAINTENANCE_EVENT, listener);
    const job = ensureListings(current, ['TRANSACTIONS']);
    assert.equal((await resumed.itemOS.getCatalogPage(options)).total, 1);
    assert.equal((await new TransactionHistoryStore(resumed.database).getPage(options, all)).total, 350);
    await job;
    window.removeEventListener(MAINTENANCE_EVENT, listener);
    assert.equal(milestones[0], 100);
    assert.ok(milestones.includes(200));
    assert.equal(JSON.parse(localStorage.getItem('pos.indexing.resumable.TRANSACTIONS')!).done, true);
    assert.equal((await new TransactionHistoryStore(resumed.database).getPage({ ...options, sort: 'items-high' }, all)).total, 350);
    assert.equal(databaseProgress(current.name), null);
});

test('blocked upgrades expose the actual cause and recover after the old tab closes', async () => {
    const { stores, previous } = await existingWorkspace('blocked', 1, true);
    const opened = stores.database.getDatabase();
    await new Promise<void>(resolve => {
        const listener = () => { if (databaseProgress('blocked')?.blocked) { window.removeEventListener(MAINTENANCE_EVENT, listener); resolve(); } };
        window.addEventListener(MAINTENANCE_EVENT, listener); listener();
    });
    assert.equal(databaseProgress('blocked')?.blocked, true);
    previous.close();
    await opened;
    assert.equal(databaseProgress('blocked'), null);
    assert.equal((await new TransactionHistoryStore(stores.database).getPage(options, all)).total, 1);
});

test('linking a legacy sale before preparation does not cache a false zero item count', async () => {
    const { stores } = await existingWorkspace('legacy-link', 1);
    const { default: CustomerTransaction } = await import('../src/models/CustomerTransaction');
    const sale = await stores.transactionsOS.getOne('000000');
    const customer = await stores.customerOS.getOne('customer');
    await stores.cutomersTransactionsOS.addOne(new CustomerTransaction({ id: 'new-link', timestamp: 2000, transaction: sale, customer }));
    const first = await stores.transactionsOS.getPage(options);
    assert.equal(first.rows[0].itemCount, 1);
    const ranked = await new TransactionHistoryStore(stores.database).getPage({ ...options, sort: 'items-high' }, all, 'sale', customer.getId());
    assert.equal(ranked.rows[0].listItemCount, 1);
});
