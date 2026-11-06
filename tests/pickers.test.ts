import { ProductSchema } from '../src/database/ProductOS';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBObjectStore } from 'fake-indexeddb';
import { resetEnvironment } from './helpers/environment';
import { catalog, sale } from './helpers/fixtures';
import ProductItem from '../src/models/ProductItem';
import Customer from '../src/models/Customer';
import PickerController from '../src/controllers/PickerController';
import PickerStore from '../src/database/PickerStore';
import PickerUsageStore from '../src/database/PickerUsageStore';
import DeletionStore from '../src/database/DeletionStore';
import { defaultSettings, parseDraft, toDraft, STORAGE_KEY } from '../src/settings/settings';

beforeEach(resetEnvironment);
const now = new Date(2026, 10, 6, 12).getTime(), day = 86400000;
const options = { query: '', offset: 0, limit: 10, recentFirst: true, purchase: false, now };

test('settings validate bounded picker sizes and retain sensible defaults', () => {
    assert.equal(defaultSettings.pickerPageSize, 10);
    assert.equal(defaultSettings.pickerRecentFirst, true);
    for (const limit of ['0', '51', '2.5', 'no']) assert.throws(() => parseDraft({ ...toDraft(defaultSettings), pickerPageSize: limit }));
    assert.equal(parseDraft({ ...toDraft(defaultSettings), pickerPageSize: '25' }).pickerPageSize, 25);
});

test('blank pickers rank recent posted orders, exclude old/deleted orders, and fill alphabetically', async () => {
    const { stores, product, customer } = await catalog();
    const alpha = new ProductItem({ id: 'alpha', name: 'Alpha', amount: 2 });
    const zed = new ProductItem({ id: 'zed', name: 'Zed', amount: 3 });
    await stores.itemOS.addMany([alpha, zed]);
    const other = new Customer({ id: 'other', name: 'Zara', phoneNumber: '555-0123' });
    await stores.contactOS.addOne(other);
    for (let index = 0; index < 3; index++) await sale(stores, zed, `new-${index}`, now - (index + 1) * day, other);
    for (let index = 0; index < 5; index++) await sale(stores, alpha, `old-${index}`, now - (40 + index) * day, customer);
    await sale(stores, product, 'recent-coffee', now - day / 2, customer);
    const picker = new PickerController(stores);
    const items = await picker.items(options);
    assert.deepEqual(items.rows.map(row => row.getId()), ['zed', 'product', 'alpha']);
    const contacts = await picker.contacts(options);
    assert.deepEqual(contacts.rows.map(row => row.getId()), ['other', 'customer']);
    assert.deepEqual((await picker.items({ ...options, recentFirst: false })).rows.map(row => row.getId()), ['alpha', 'product', 'zed']);
    await new DeletionStore(stores.database).delete('TRANSACTIONS', 'new-0');
    await new DeletionStore(stores.database).delete('TRANSACTIONS', 'new-1');
    await new DeletionStore(stores.database).delete('TRANSACTIONS', 'new-2');
    assert.deepEqual((await picker.items(options)).rows.map(row => row.getId()), ['product', 'alpha', 'zed']);
    await new DeletionStore(stores.database).delete('PRODUCTS', product.getId());
    assert.ok((await picker.items(options)).rows.every(row => row.getId() !== product.getId()));
});

test('search reaches beyond suggestions, supports phone numbers, and paginates without hydrating the catalog', async context => {
    const { stores } = await catalog();
    await stores.itemOS.addMany(Array.from({ length: 35 }, (_, index) => new ProductItem({ id: `p${index}`, name: `Product ${String(index).padStart(2, '0')}`, amount: 5 })));
    await stores.contactOS.addOne(new Customer({ id: 'remote', name: 'Remote Person', phoneNumber: '999-1234' }));
    const get = IDBObjectStore.prototype.get;
    let reads = 0, hydrations = 0;
    context.mock.method(IDBObjectStore.prototype, 'get', function(this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) { if (this.name === 'PRODUCTS') reads++; return get.call(this, key); });
    const convert = stores.itemOS.getSchemaAsObject.bind(stores.itemOS);
    context.mock.method(stores.itemOS, 'getSchemaAsObject', async (row: ProductSchema) => { hydrations++; return convert(row); });
    const picker = new PickerController(stores);
    const first = await picker.items({ ...options, recentFirst: false });
    assert.equal(first.rows.length, 10);
    assert.equal(first.hasMore, true);
    assert.equal(reads, 11);
    assert.equal(hydrations, 10);
    const second = await picker.items({ ...options, offset: 10, recentFirst: false });
    assert.equal(second.rows.length, 10);
    assert.ok(second.rows.every(row => !first.rows.some(previous => previous.getId() === row.getId())));
    const found = await picker.items({ ...options, query: 'Product 34' });
    assert.equal(found.rows[0].getId(), 'p34');
    assert.equal(found.hasMore, false);
    assert.equal((await picker.contacts({ ...options, query: '999-1234' })).rows[0].getId(), 'remote');
});

test('purchase usage is separate and item eligibility is checked before filling a page', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
    const { stores, product, customer } = await catalog();
    const onlyPurchase = new ProductItem({ id: 'wholesale', name: 'Wholesale Only', amount: 0, canSell: 0, canPurchase: 1 });
    const onlySale = new ProductItem({ id: 'sale-only', name: 'Sale Only', amount: 4, canSell: 1, canPurchase: 0 });
    await stores.itemOS.addMany([onlyPurchase, onlySale]);
    await stores.purchasingOS.receive({ contactId: customer.getId(), timestamp: now - day, reference: 'PICKER-INVOICE', lines: [{ productId: onlyPurchase.getId(), quantity: 5, unitCost: 2 }] });
    const picker = new PickerController(stores);
    const buys = await picker.items({ ...options, purchase: true, limit: 1 });
    assert.equal(buys.rows[0].getId(), onlyPurchase.getId());
    assert.equal(buys.hasMore, true);
    assert.ok((await picker.items({ ...options, purchase: true })).rows.every(row => row.getId() !== onlySale.getId()));
    assert.ok((await picker.items(options)).rows.every(row => row.getId() !== onlyPurchase.getId()));
    assert.equal((await picker.contacts({ ...options, purchase: true })).rows[0].getId(), customer.getId());
    const usage = await new PickerUsageStore(stores.database).get(false, now);
    assert.equal(usage.items.size, 0);
    assert.equal((await new PickerStore(stores.database).getPage('PRODUCTS', { ...options, limit: 1, query: product.getName() })).rows.length, 1);
});
