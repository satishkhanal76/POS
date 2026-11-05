import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import ItemsController from '../src/controllers/ItemsController';
import CustomerController from '../src/controllers/CustomerController';
import { resetEnvironment } from './helpers/environment';
import { catalog, sale } from './helpers/fixtures';

beforeEach(resetEnvironment);
test('item creation persists a product that can be read through the controller', async () => {
  const { stores } = await catalog();
  const controller = new ItemsController(stores.itemOS);
  const item = await controller.handleFormSubmit({ name: 'Tea', price: 2.5 });
  assert.ok(item);
  assert.equal((await controller.getOne(item.getId())).getAmount(), 2.5);
});
test('item edits trim names and preserve the original stored price', async () => {
  const { stores, product } = await catalog();
  await new ItemsController(stores.itemOS).updateItem(product.getId(), '  Espresso  ', 7);
  const updated = await stores.itemOS.getOne(product.getId());
  assert.equal(updated.getName(), 'Espresso');
  assert.equal(updated.getAmount(), 7);
  assert.equal(updated.getOriginalAmount(), 5);
});
test('invalid item updates reject without changing the catalog', async () => {
  const { stores, product } = await catalog();
  const controller = new ItemsController(stores.itemOS);
  for (const [name, price] of [[' ', 5], ['Coffee', -1], ['Coffee', NaN], ['Coffee', Infinity]] as const) {
    await assert.rejects(() => controller.updateItem(product.getId(), name, price));
  }
  assert.equal((await stores.itemOS.getOne(product.getId())).getAmount(), 5);
  assert.equal((await stores.itemPriceChangesOS.getAll()).length, 0);
});
test('customer edits preserve the ID and existing transaction relationships', async () => {
  const { stores, product, customer } = await catalog();
  await sale(stores, product, 'sale', 1000, customer);
  await new CustomerController(stores.customerOS).updateCustomer(customer.getId(), { name: ' Sam ', phoneNumber: ' 555-0102 ' });
  const updated = await stores.customerOS.getOne(customer.getId());
  assert.equal(updated.getName(), 'Sam');
  assert.equal(updated.getPhoneNumber(), '555-0102');
  const linked = await stores.cutomersTransactionsOS.getOne('link-sale');
  assert.equal(linked.getCustomer().getId(), customer.getId());
  assert.equal(linked.getCustomer().getName(), 'Sam');
  assert.equal(linked.getTransaction().getTotal(), 5);
});
test('invalid names and missing customer records cannot be saved', async () => {
  const { stores, customer } = await catalog();
  const controller = new CustomerController(stores.customerOS);
  await assert.rejects(() => controller.updateCustomer(customer.getId(), { name: ' ', phoneNumber: '' }));
  await assert.rejects(() => controller.updateCustomer('missing', { name: 'No customer', phoneNumber: '' }));
  assert.equal((await stores.customerOS.getAll()).length, 1);
});
test('referenced customers and products cannot be deleted', async () => {
  const { stores, product, customer } = await catalog();
  await sale(stores, product, 'sale', 1000, customer);
  await assert.rejects(() => stores.itemOS.deleteOne(product.getId()));
  await assert.rejects(() => stores.customerOS.deleteOne(customer.getId()));
  assert.equal((await stores.transactionsOS.getOne('sale')).getTotal(), 5);
});
test('deleting an unused item removes its price history', async () => {
  const { stores, product } = await catalog();
  await stores.itemOS.updateDetails(product.getId(), 'Coffee', 7);
  await stores.itemOS.deleteOne(product.getId());
  assert.equal((await stores.itemOS.getAll()).length, 0);
  assert.equal((await stores.itemPriceChangesOS.getAll()).length, 0);
});
