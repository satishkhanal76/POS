import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { resetEnvironment } from "./helpers/environment";
import { catalog, sale } from "./helpers/fixtures";
import { STORAGE_KEY } from "../src/settings/settings";
import DashboardOS from "../src/database/DashboardOS";
import DashboardController from "../src/controllers/DashboardController";
import PrintReportsController from "../src/controllers/PrintReportsController";
import TransactionHistoryController from "../src/controllers/TransactionHistoryController";
import TransactionHistoryStore from "../src/database/TransactionHistoryStore";
import DeletionStore from "../src/database/DeletionStore";
import Transaction from "../src/models/Transaction";
import { dateInput } from "../src/dashboard/period";

beforeEach(resetEnvironment);
const time = (day: number) => new Date(2025, 0, day, 12).getTime();
const range = { start: time(1) - 12 * 3600000, end: time(6) - 12 * 3600000 };

async function fixture() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ purchasing: true }));
  const data = await catalog();
  const { stores, product, customer } = data;
  await sale(stores, product, "linked-sale", time(1), customer);
  await stores.cutomersTransactionsOS.recordPayment(
    new Transaction("payment", time(1) + 1, 2),
    customer,
  );
  const purchase = await stores.purchasingOS.receive({
    contactId: customer.getId(),
    timestamp: time(2),
    reference: "PUR-REPORT",
    lines: [{ productId: product.getId(), quantity: 1, unitCost: 7 }],
  });
  await stores.purchasingOS.pay(customer.getId(), 3, time(4), "supplier-ref");
  await sale(stores, product, "outside-sale", time(10));
  return { ...data, purchase };
}

test("overview and print reports include supplier-only activity and omit empty dates", async () => {
  const { stores } = await fixture();
  const controller = new DashboardController(new DashboardOS(stores.database));
  const summary = await controller.getSummary(range);
  assert.equal(summary.sales, 5);
  assert.equal(summary.payments, 2);
  assert.equal(summary.purchases, 7);
  assert.equal(summary.purchaseCount, 1);
  assert.equal(summary.supplierPayments, 3);
  assert.equal(summary.supplierPaymentCount, 1);
  assert.equal(summary.supplierBalanceMovement, 4);
  assert.deepEqual(
    summary.buckets.map((bucket) => bucket.key),
    [1, 2, 4].map((day) => dateInput(new Date(time(day)))),
  );
  const reports = new PrintReportsController(stores);
  const dashboard = await reports.getReport(range, "dashboard");
  assert.deepEqual(
    dashboard.transactions.map((row) => row.id),
    ["payment", "linked-sale"],
  );
  assert.ok(
    dashboard.transactions.every((row) => row.customers[0].name === "Alex"),
  );
  assert.deepEqual(
    dashboard.supplierTransactions.map((row) => row.kind),
    ["supplier-payment", "purchase"],
  );
  assert.deepEqual(dashboard.summary, summary);
  const overview = await reports.getReport(range, "overview");
  assert.deepEqual(overview.summary.buckets, summary.buckets);
  const disabled = await reports.getReport(range, "dashboard", false);
  assert.equal(disabled.supplierTransactions.length, 0);
  assert.equal(disabled.summary.purchaseCount, 0);
  assert.equal(disabled.summary.buckets.length, 1);
});

test("supplier summaries respect selected dates and soft deletion while zero-value activity retains a bucket", async () => {
  const { stores, purchase } = await fixture();
  const controller = new DashboardController(new DashboardOS(stores.database));
  const day = { start: time(2) - 12 * 3600000, end: time(3) - 12 * 3600000 };
  assert.equal((await controller.getSummary(day)).purchaseCount, 1);
  await new DeletionStore(stores.database).delete("PURCHASES", purchase);
  assert.equal((await controller.getSummary(day)).buckets.length, 0);
  assert.equal(
    (await controller.getSummary({ ...day, includeDeleted: true })).purchases,
    7,
  );
  const zero = controller.summarize([], range, [
    { timestamp: time(2), total: 0, kind: "purchase" },
  ]);
  assert.equal(zero.buckets.length, 1);
  assert.equal(zero.purchaseCount, 1);
  const monthly = controller.summarize(
    [],
    { start: time(1), end: new Date(2025, 11, 31).getTime() },
    [{ timestamp: time(2), total: 0, kind: "purchase" }],
  );
  assert.deepEqual(
    monthly.buckets.map((bucket) => bucket.key),
    ["2025-01"],
  );
});

test("transaction pages resolve linked contact names only for the selected rows and reflect unlinking", async () => {
  const { stores, customer } = await fixture();
  const controller = new TransactionHistoryController(
    new TransactionHistoryStore(stores.database),
    stores.transactionsOS,
  );
  const options = { page: 1, pageSize: 10, sort: "newest" as const };
  const result = await controller.getPage(options, range);
  assert.equal(result.rows.length, 2);
  assert.ok(result.rows.every((row) => row.contacts?.[0].name === "Alex"));
  await stores.cutomersTransactionsOS.unlinkTransaction(
    "linked-sale",
    customer.getId(),
  );
  const updated = await controller.getPage(options, range);
  assert.deepEqual(
    updated.rows.find((row) => row.id === "linked-sale")?.contacts,
    [],
  );
  assert.equal(
    updated.rows.find((row) => row.id === "payment")?.contacts?.[0].name,
    "Alex",
  );
  await new DeletionStore(stores.database).delete("CUSTOMER", customer.getId());
  const report = await new PrintReportsController(stores).getReport(
    range,
    "dashboard",
  );
  assert.equal(
    report.transactions.find((row) => row.id === "payment")?.customers[0]?.name,
    "Alex",
  );
  assert.equal(report.summary.customers, 0);
});
