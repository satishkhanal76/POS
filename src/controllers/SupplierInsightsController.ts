import { DashboardRange } from "../dashboard/period";
import SupplierInsightsStore from "../database/SupplierInsightsStore";

export default class SupplierInsightsController {
  constructor(private readonly store: SupplierInsightsStore) {}
  async getSummary(range: DashboardRange) {
    const rows = (await this.store.getRows(range)).map((row) => ({
      ...row,
      averagePurchase: row.purchaseCount
        ? row.purchases / row.purchaseCount
        : 0,
      balance:
        Math.round((row.lifetimePurchases - row.lifetimePayments) * 100) / 100,
    }));
    const active = rows.filter((row) => row.purchaseCount || row.paymentCount);
    const purchases = active.reduce((sum, row) => sum + row.purchases, 0);
    const count = active.reduce((sum, row) => sum + row.purchaseCount, 0);
    return {
      activeSuppliers: active.length,
      averagePurchase: count ? purchases / count : 0,
      owed: rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0),
      credit: rows.reduce((sum, row) => sum + Math.max(0, -row.balance), 0),
      topSuppliers: active.sort(
        (a, b) =>
          b.purchases - a.purchases ||
          b.payments - a.payments ||
          a.name.localeCompare(b.name),
      ),
      balances: rows.sort(
        (a, b) => b.balance - a.balance || a.name.localeCompare(b.name),
      ),
    };
  }
}
export type SupplierInsightsSummary = Awaited<
  ReturnType<SupplierInsightsController["getSummary"]>
>;
export type SupplierInsight = SupplierInsightsSummary["balances"][number];
