import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resetEnvironment } from './helpers/environment';
import { catalog, putRaw } from './helpers/fixtures';
import ProductItem from '../src/models/ProductItem';
import Customer from '../src/models/Customer';
import DeletionStore from '../src/database/DeletionStore';
import { STORAGE_KEY } from '../src/settings/settings';
import { IDBObjectStore } from 'fake-indexeddb';
import { ProductSchema } from '../src/database/ProductOS';

beforeEach(resetEnvironment);
const options = { page: 1, pageSize: 10, sort: 'name-asc' as const };

test('name sorting covers the matching catalog before pagination in both directions', async () => {
    const { stores } = await catalog();
    await stores.itemOS.addMany(Array.from({ length: 25 }, (_, i) => new ProductItem({ id: `p${i}`, name: `Item ${String(i).padStart(2, '0')}`, amount: i })));
    await stores.contactOS.addMany(Array.from({ length: 25 }, (_, i) => new Customer({ id: `c${i}`, name: `Person ${String(i).padStart(2, '0')}`, phoneNumber: `555-${i}` })));
    const asc = await stores.itemOS.getCatalogPage(options, 'Item');
    const desc = await stores.itemOS.getCatalogPage({ ...options, sort: 'name-desc' }, 'Item');
    const second = await stores.itemOS.getCatalogPage({ ...options, sort: 'name-desc', page: 2 }, 'Item');
    assert.equal(asc.rows[0].getName(), 'Item 00');
    assert.equal(desc.rows[0].getName(), 'Item 24');
    assert.equal(second.rows[0].getName(), 'Item 14');
    assert.equal(desc.total, 25);
    assert.equal((await stores.contactOS.getCatalogPage({ ...options, sort: 'name-desc' }, '555-')).rows[0].getName(), 'Person 24');
});

test('price sorting uses current prices and hydrates only the requested page', async context => {
    const { stores } = await catalog();
    await stores.itemOS.addMany(Array.from({ length: 25 }, (_, i) => new ProductItem({ id: `p${i}`, name: `Item ${String(i).padStart(2, '0')}`, amount: i + 1 })));
    await stores.itemOS.updateDetails('p0', 'Item 00', 99);
    await stores.itemOS.addOne(new ProductItem({ id: 'no-price', name: 'Item No Sale Price', amount: 0, canSell: 0 }));
    let hydrated = 0;
    const convert = stores.itemOS.getSchemaAsObject.bind(stores.itemOS);
    context.mock.method(stores.itemOS, 'getSchemaAsObject', async (row: ProductSchema) => { hydrated++; return convert(row); });
    const high = await stores.itemOS.getCatalogPage({ ...options, sort: 'price-high' }, 'Item');
    assert.equal(high.total, 26);
    assert.equal(high.rows[0].getId(), 'p0');
    assert.equal(high.rows[0].getAmount(), 99);
    assert.equal(hydrated, 10);
    const low = await stores.itemOS.getCatalogPage({ ...options, sort: 'price-low', pageSize: 0 }, 'Item');
    assert.equal(low.rows[0].getAmount(), 2);
    assert.equal(low.rows.at(-1)?.getId(), 'no-price');
    await new DeletionStore(stores.database).delete('PRODUCTS', 'p0');
    assert.equal((await stores.itemOS.getCatalogPage({ ...options, sort: 'price-high' }, 'Item')).rows[0].getAmount(), 25);
    assert.equal((await stores.itemOS.getCatalogPage({ ...options, sort: 'price-high', includeDeleted: true }, 'Item')).rows[0].getId(), 'p0');
});

test('legacy catalog keys remain sortable without a database upgrade or history rebuild', async () => {
    const { stores, product } = await catalog();
    const database = await stores.database.getDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('PRODUCTS', 'readwrite');
        const store = transaction.objectStore('PRODUCTS'), request = store.get(product.getId());
        request.onsuccess = () => store.put({ ...request.result, catalogKeys: request.result.catalogKeys.map((key: unknown[]) => key.slice(0, 7)) });
        transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
    });
    const result = await stores.itemOS.getCatalogPage({ ...options, sort: 'price-low' });
    assert.equal(result.rows[0].getAmount(), 5);
    assert.equal(database.version, 14);
});

test('stock sorts use current counts, handle missing/negative stock, and fall back to name when disabled', async context => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stockManagement: true }));
    const { stores, product } = await catalog();
    await stores.itemOS.addMany([new ProductItem({ id: 'alpha', name: 'Alpha', amount: 1 }), new ProductItem({ id: 'zed', name: 'Zed', amount: 2 })]);
    await putRaw(stores, 'STOCK', { id: product.getId(), count: -2 });
    await stores.stockOS.setCount('zed', 15.5);
    const high = await stores.itemOS.getCatalogPage({ ...options, sort: 'stock-high' });
    const low = await stores.itemOS.getCatalogPage({ ...options, sort: 'stock-low' });
    assert.deepEqual(high.rows.map(row => row.getId()), ['zed', 'alpha', 'product']);
    assert.deepEqual(low.rows.map(row => row.getId()), ['product', 'alpha', 'zed']);
    await stores.stockOS.setCount('alpha', 30);
    assert.equal((await stores.itemOS.getCatalogPage({ ...options, sort: 'stock-high' })).rows[0].getId(), 'alpha');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stockManagement: false }));
    const get = IDBObjectStore.prototype.get;
    context.mock.method(IDBObjectStore.prototype, 'get', function(this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) { assert.notEqual(this.name, 'STOCK'); return get.call(this, key); });
    assert.equal((await stores.itemOS.getCatalogPage({ ...options, sort: 'stock-high' })).rows[0].getId(), 'alpha');
});
