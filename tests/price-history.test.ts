import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import PriceHistoryController from "../src/controllers/PriceHistoryController";
import { resetEnvironment } from "./helpers/environment";
import { catalog, sale } from "./helpers/fixtures";

beforeEach(resetEnvironment);
test("prices fall back to the original until a price event takes effect", async (context) => {
  const { stores, product } = await catalog();
  context.mock.method(Date, "now", () => 2000);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  assert.equal(
    (await stores.itemOS.getAtTimestamp(product.getId(), 1999)).getAmount(),
    5,
  );
  assert.equal(
    (await stores.itemOS.getAtTimestamp(product.getId(), 2000)).getAmount(),
    7,
  );
  assert.equal((await stores.itemOS.getOne(product.getId())).getAmount(), 7);
});
test("multiple changes use the latest qualifying event and maintain same-millisecond order", async (context) => {
  const { stores, product } = await catalog();
  context.mock.method(Date, "now", () => 2000);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 9);
  assert.equal(
    (await stores.itemOS.getAtTimestamp(product.getId(), 2000)).getAmount(),
    7,
  );
  assert.equal(
    (await stores.itemOS.getAtTimestamp(product.getId(), 2001)).getAmount(),
    9,
  );
  assert.equal((await stores.itemOS.getOne(product.getId())).getAmount(), 9);
});
test("changing a catalog price leaves old transaction totals unchanged", async (context) => {
  const { stores, product } = await catalog();
  await sale(stores, product, "before", 1000);
  context.mock.method(Date, "now", () => 2000);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  await sale(
    stores,
    await stores.itemOS.getOne(product.getId()),
    "after",
    3000,
  );
  assert.equal((await stores.transactionsOS.getOne("before")).getTotal(), 5);
  assert.equal((await stores.transactionsOS.getOne("after")).getTotal(), 7);
});
test("name-only changes do not create redundant price events", async () => {
  const { stores, product } = await catalog();
  await stores.itemOS.updateDetails(product.getId(), "Renamed", 5);
  assert.equal((await stores.itemPriceChangesOS.getAll()).length, 0);
});
test("the history listing derives previous prices and sorts changes newest first", async (context) => {
  const { stores, product } = await catalog();
  context.mock.method(Date, "now", () => 2000);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 7);
  await stores.itemOS.updateDetails(product.getId(), "Coffee", 9);
  const history = await new PriceHistoryController(
    stores.itemOS,
    stores.itemPriceChangesOS,
  ).getHistory();
  assert.deepEqual(
    history.map((row) => [row.previousAmount, row.amount]),
    [
      [7, 9],
      [5, 7],
    ],
  );
  assert.equal(history[0].itemName, "Coffee");
});
test("history is empty before any price changes", async () => {
  const { stores } = await catalog();
  assert.deepEqual(
    await new PriceHistoryController(
      stores.itemOS,
      stores.itemPriceChangesOS,
    ).getHistory(),
    [],
  );
});
