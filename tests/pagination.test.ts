import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBIndex, IDBObjectStore } from 'fake-indexeddb';
import CustomerTransaction from '../src/models/CustomerTransaction';
import { PageOptions } from '../src/database/Pagination';
import { resetEnvironment } from './helpers/environment';
import { historyFixture } from './helpers/fixtures';

beforeEach(resetEnvironment);
const options: PageOptions = { page: 1, pageSize: 10, sort: 'newest' };

test('transaction pages default to the newest ten records with exact total counts', async () => {
  const { stores } = await historyFixture();
  const result = await stores.transactionsOS.getPage(options);
  assert.equal(result.total, 35);
  assert.deepEqual(result.rows.map(row => row.id), Array.from({ length: 10 }, (_, i) => `t${34 - i}`));
  assert.equal(result.rows[0].itemCount, 1);
  assert.equal(result.rows[0].total, 5);
});
test('next pages skip earlier entries, and oldest reverses database ordering', async () => {
  const { stores } = await historyFixture();
  const newest = await stores.transactionsOS.getPage({ ...options, page: 2 });
  const oldest = await stores.transactionsOS.getPage({ ...options, page: 2, sort: 'oldest' });
  assert.equal(newest.rows[0].id, 't24');
  assert.equal(oldest.rows[0].id, 't10');
});
test('page sizes are enforced and out-of-range pages clamp to the final page', async () => {
  const { stores } = await historyFixture();
  assert.equal((await stores.transactionsOS.getPage({ ...options, pageSize: 25 })).rows.length, 25);
  const last = await stores.transactionsOS.getPage({ ...options, page: 999 });
  assert.equal(last.page, 4);
  assert.equal(last.rows.length, 5);
  assert.equal((await stores.transactionsOS.getPage({ ...options, pageSize: 3 })).pageSize, 10);
});
test('customer pages query only the selected customer range', async () => {
  const { stores } = await historyFixture();
  const result = await stores.cutomersTransactionsOS.getPage('c0', options);
  assert.equal(result.total, 3);
  assert.deepEqual(result.rows.map(row => row.id), ['t24', 't12', 't0']);
  const oldest = await stores.cutomersTransactionsOS.getPage('c0', { ...options, sort: 'oldest' });
  assert.equal(oldest.rows[0].id, 't0');
});
test('customer summaries retain lifetime counts and totals across pages', async () => {
  const { stores } = await historyFixture();
  const first = await stores.customerSummariesOS.getPage(options);
  assert.equal(first.total, 12);
  assert.equal(first.rows.length, 10);
  assert.equal(first.rows[0].data.id, 'c10');
  const second = await stores.customerSummariesOS.getPage({ ...options, page: 2 });
  assert.deepEqual(second.rows.map(row => row.data.id), ['c0', 'c11']);
  assert.equal(second.rows[0].data.count, 3);
  assert.equal(second.rows[0].data.total, 15);
});
test('duplicate customer links roll back their summary updates', async () => {
  const { stores, customers } = await historyFixture();
  const transaction = await stores.transactionsOS.getOne('t0');
  await assert.rejects(() => stores.cutomersTransactionsOS.addOne(new CustomerTransaction({
    id: 'link-t0', timestamp: 1000, customer: customers[0], transaction,
  })));
  const summaries = await stores.customerSummariesOS.getPage({ ...options, pageSize: 25 });
  assert.equal(summaries.rows.find(row => row.data.id === 'c0')?.data.count, 3);
});
test('listing never calls getAll or reconstructs transaction models', async context => {
  const { stores } = await historyFixture();
  context.mock.method(IDBObjectStore.prototype, 'getAll', () => { throw new Error('Unbounded table read'); });
  context.mock.method(IDBIndex.prototype, 'getAll', () => { throw new Error('Unbounded index read'); });
  context.mock.method(stores.transactionsOS, 'getSchemaAsObject', async () => { throw new Error('Full sale hydration'); });
  assert.equal((await stores.transactionsOS.getPage(options)).rows.length, 10);
  assert.equal((await stores.cutomersTransactionsOS.getPage('c0', options)).rows.length, 3);
  assert.equal((await stores.customerSummariesOS.getPage(options)).rows.length, 10);
});
test('a transaction page fetches headers only for its ten visible records', async context => {
  const { stores } = await historyFixture();
  const original = IDBObjectStore.prototype.get;
  const reads: Array<[string, IDBValidKey | IDBKeyRange]> = [];
  context.mock.method(IDBObjectStore.prototype, 'get', function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
    reads.push([this.name, key]);
    return original.call(this, key);
  });
  await stores.transactionsOS.getPage({ ...options, page: 2 });
  assert.deepEqual(reads.map(([table, key]) => `${table}/${String(key)}`), Array.from({ length: 10 }, (_, i) => `TRANSACTIONS/t${24 - i}`));
});
test('missing customer ranges return an empty first page', async () => {
  const { stores } = await historyFixture();
  const result = await stores.cutomersTransactionsOS.getPage('missing', options);
  assert.equal(result.total, 0);
  assert.equal(result.page, 1);
  assert.deepEqual(result.rows, []);
});
