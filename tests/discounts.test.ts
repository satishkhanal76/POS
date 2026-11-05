import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import DiscountController from '../src/controllers/DiscountController';
import { DiscountItemType } from '../src/models/DiscountItem';
import Transaction from '../src/models/Transaction';
import { getDiscountAmount } from '../src/validators/DiscountValidator';
import { resetEnvironment } from './helpers/environment';
import { catalog } from './helpers/fixtures';

beforeEach(resetEnvironment);
test('flat and percentage discounts accept decimals', () => {
  assert.equal(getDiscountAmount(DiscountItemType.FLAT, 2.5, 100, 100), 2.5);
  assert.equal(getDiscountAmount(DiscountItemType.PERCENTAGE, 12.5, 100, 100), 12.5);
});
test('100 percent is allowed and excessive or invalid deductions are rejected', () => {
  assert.equal(getDiscountAmount(DiscountItemType.PERCENTAGE, 100, 100, 100), 100);
  for (const value of [0, -1, NaN, Infinity, 101]) assert.throws(() => getDiscountAmount(DiscountItemType.PERCENTAGE, value, 100, 100));
  assert.throws(() => getDiscountAmount(DiscountItemType.FLAT, 51, 100, 50));
  assert.throws(() => getDiscountAmount(99 as DiscountItemType, 10, 100, 100));
});
test('both discount types survive posting and reconstruction with correct totals', async () => {
  const { stores, product } = await catalog();
  const transaction = new Transaction('sale', 1000);
  transaction.addProductItem(product);
  const controller = new DiscountController(stores.discountOS);
  await controller.apply(transaction, { type: DiscountItemType.PERCENTAGE, value: 10 });
  await controller.apply(transaction, { type: DiscountItemType.FLAT, value: 1.25 });
  await stores.transactionsOS.postTransaction(transaction);
  const saved = await stores.transactionsOS.getOne('sale');
  assert.equal(saved.getTotal(), 3.25);
  assert.deepEqual(saved.getAllTransactionDiscountItems().map(item => item.getItem().getDiscountType()).sort(), [0, 1]);
  assert.ok(saved.getAllTransactionDiscountItems().every(item => !item.getIsQuantityChangable()));
});
test('failed discount persistence does not mutate the active order', async context => {
  const { stores, product } = await catalog();
  const transaction = new Transaction(); transaction.addProductItem(product);
  context.mock.method(stores.discountOS, 'addOne', async () => { throw new Error('Simulated failure'); });
  await assert.rejects(() => new DiscountController(stores.discountOS).apply(transaction, { type: DiscountItemType.FLAT, value: 1 }));
  assert.equal(transaction.getTotal(), 5);
  assert.equal(transaction.getAllTransactionDiscountItems().length, 0);
});
test('posted and empty transactions cannot receive discounts', async () => {
  const { stores, product } = await catalog();
  const controller = new DiscountController(stores.discountOS);
  await assert.rejects(() => controller.apply(new Transaction(), { type: DiscountItemType.FLAT, value: 1 }));
  const transaction = new Transaction(); transaction.addProductItem(product); transaction.setIsPosted(true);
  await assert.rejects(() => controller.apply(transaction, { type: DiscountItemType.FLAT, value: 1 }));
});
