import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import Transaction from "../src/models/Transaction";
import ProductItem from "../src/models/ProductItem";
import DiscountItem, { DiscountItemType } from "../src/models/DiscountItem";
import CustomSet from "../src/Data-Structures/UniqueSet";
import { resetEnvironment } from "./helpers/environment";

beforeEach(resetEnvironment);
const product = (id = "p", amount = 10) =>
  new ProductItem({ id, name: id, amount });
const discount = (id: string, type: DiscountItemType, amount: number) =>
  new DiscountItem({ id, name: id, amount, discountType: type });

test("a new transaction has an ID, date, zero total, and no items", () => {
  const transaction = new Transaction("sale", 1000);
  assert.equal(transaction.getId(), "sale");
  assert.equal(transaction.getTimestamp(), 1000);
  assert.equal(transaction.getTotal(), 0);
  assert.equal(transaction.hasItems(), false);
  assert.equal(transaction.isPosted(), false);
});
test("adding the same product increases quantity instead of duplicating the line", () => {
  const transaction = new Transaction();
  transaction.addProductItem(product());
  transaction.addProductItem(product());
  assert.equal(transaction.getAllTransactionProductItems().length, 1);
  assert.equal(transaction.getTransactionProductItem("p")?.getQuantity(), 2);
  assert.equal(transaction.getTotal(), 20);
});
test("quantity changes, decrements, and removals recalculate totals", () => {
  const transaction = new Transaction();
  transaction.addProductItem(product());
  transaction.addProductItem(product("other", 3));
  transaction.changeTransactionItemQuantity("p", 4);
  assert.equal(transaction.getTotal(), 43);
  transaction.decrementTransactionItem("p");
  assert.equal(transaction.getTotal(), 33);
  transaction.removeTransactionItem("p");
  assert.equal(transaction.getTotal(), 3);
});
test("flat discounts subtract an amount, while percentages use the product subtotal", () => {
  const transaction = new Transaction();
  transaction.addProductItem(product("p", 100));
  transaction.addDiscountItem(
    discount("percent", DiscountItemType.PERCENTAGE, 10),
  );
  transaction.addDiscountItem(discount("flat", DiscountItemType.FLAT, 5.5));
  assert.equal(transaction.getTotal(), 84.5);
});
test("percentage deductions recalculate when product quantities change", () => {
  const transaction = new Transaction();
  transaction.addProductItem(product());
  transaction.addDiscountItem(discount("d", DiscountItemType.PERCENTAGE, 10));
  transaction.changeTransactionItemQuantity("p", 3);
  assert.equal(transaction.getTotal(), 27);
});
test("removing a discount restores the order total", () => {
  const transaction = new Transaction();
  transaction.addProductItem(product());
  transaction.addDiscountItem(discount("d", DiscountItemType.FLAT, 2));
  transaction.removeTransactionItem("d");
  assert.equal(transaction.getTotal(), 10);
});
test("discount quantities cannot be changed", () => {
  const item = new Transaction().addDiscountItem(
    discount("d", DiscountItemType.FLAT, 2),
  );
  item.setQuantity(4);
  assert.equal(item.getQuantity(), 1);
});
test("an effective product price preserves its original price separately", () => {
  const item = new ProductItem({ id: "p", name: "Coffee", amount: 7 }, 3);
  assert.equal(item.getAmount(), 7);
  assert.equal(item.getOriginalAmount(), 3);
});
test("unique collections replace and remove by stable ID", () => {
  const collection = new CustomSet([product()]);
  collection.add(product("p", 20));
  assert.equal(collection.size, 1);
  assert.equal(collection.get("p")?.getAmount(), 20);
  assert.equal(collection.remove("p")?.getAmount(), 20);
  assert.equal(collection.size, 0);
});
