import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import TransactionController from "../src/controllers/TransactionController";
import CustomersTransactionsController from "../src/controllers/CustomersTransactionsController";
import ItemsController from "../src/controllers/ItemsController";
import Transaction from "../src/models/Transaction";
import { resetEnvironment } from "./helpers/environment";
import { catalog, sale } from "./helpers/fixtures";

beforeEach(resetEnvironment);
test("the transaction controller creates, posts, and retrieves its active sale", async () => {
  const { stores, product } = await catalog();
  const controller = new TransactionController(stores.transactionsOS);
  const transaction = controller.getNewTransaction();
  transaction.addProductItem(product);
  assert.ok(await controller.postTransaction(transaction));
  const loaded = await controller.getTransactionById(transaction.getId());
  assert.equal(loaded?.getTotal(), 5);
  assert.equal(loaded?.isPosted(), true);
});
test("a controller cannot post an unrelated transaction", async () => {
  const { stores, product } = await catalog();
  const unrelated = new Transaction("other");
  unrelated.addProductItem(product);
  assert.equal(
    await new TransactionController(stores.transactionsOS).postTransaction(
      unrelated,
    ),
    null,
  );
  assert.equal(
    (
      await stores.transactionsOS.getPage({
        page: 1,
        pageSize: 10,
        sort: "newest",
      })
    ).total,
    0,
  );
});
test("legacy transaction accessors still retrieve history and JSON headers", async () => {
  const { stores, product } = await catalog();
  await sale(stores, product, "old", 1000);
  await sale(stores, product, "new", 2000);
  const controller = new TransactionController(stores.transactionsOS);
  const latest = await controller.getLatestTransaction(null);
  assert.equal(latest?.getId(), "new");
  const previous = await controller.getLatestTransaction(latest);
  assert.equal(previous?.getId(), "old");
  assert.equal(await controller.getLatestTransaction(previous), null);
  assert.equal((await controller.getAllTransactionsByTimestamp()).length, 2);
  assert.equal(JSON.parse(await controller.getAllAsJSONString()).length, 2);
});
test("customer controllers expose paged summaries and scoped sales", async () => {
  const { stores, product, customer } = await catalog();
  await sale(stores, product, "sale", 1000, customer);
  const controller = new CustomersTransactionsController(
    stores.cutomersTransactionsOS,
    stores.customerSummariesOS,
  );
  const options = { page: 1, pageSize: 10, sort: "newest" as const };
  assert.equal(
    (await controller.getSummaryPage(options)).rows[0].data.total,
    5,
  );
  assert.equal(
    (await controller.getPage(customer.getId(), options)).rows[0].id,
    "sale",
  );
  const legacy = await controller.getAllItems();
  assert.equal(legacy[0].getTransactions().getTotal(), 5);
});
test("legacy item JSON import/export retains IDs and prices", async () => {
  const { stores } = await catalog();
  const controller = new ItemsController(stores.itemOS);
  await controller.addManyFromJSON(
    JSON.stringify([{ id: "imported", name: "Tea", amount: 2.5 }]),
  );
  const exported = JSON.parse(await controller.getAllAsJSONString());
  assert.ok(
    exported.some(
      (row: { id: string; amount: number }) =>
        row.id === "imported" && row.amount === 2.5,
    ),
  );
  await assert.rejects(() => controller.addManyFromJSON("{bad"));
});
