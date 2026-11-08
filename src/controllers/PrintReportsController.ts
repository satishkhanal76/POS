import SupplierInsightsController from "./SupplierInsightsController";
import SupplierInsightsStore from "../database/SupplierInsightsStore";
import { IDataBaseContext } from "../database/DatabaseStores";
import DashboardOS from "../database/DashboardOS";
import DashboardController from "./DashboardController";
import { DashboardRange } from "../dashboard/period";
import { PurchasingRow } from "../database/PurchasingOS";

/** Print queries use the same range and deletion rules as the on-screen reports. */
export default class PrintReportsController {
  constructor(private readonly stores: IDataBaseContext) {}
  async getReport(
    range: DashboardRange,
    mode: "dashboard" | "overview",
    purchasing = true,
  ) {
    const store = new DashboardOS(this.stores.database);
    const [entries, supplierEntries, supplierRows, supplierInsights] =
      await Promise.all([
        store.getEntries(range),
        purchasing ? store.getSupplierEntries(range) : Promise.resolve([]),
        purchasing && mode === "dashboard"
          ? this.stores.purchasingOS.getPage(
              {
                page: 1,
                pageSize: 0,
                sort: "newest",
                includeDeleted: range.includeDeleted,
              },
              range,
            )
          : Promise.resolve({ rows: [] as PurchasingRow[] }),
        purchasing && mode === "overview"
          ? new SupplierInsightsController(
              new SupplierInsightsStore(this.stores.database),
            ).getSummary(range)
          : Promise.resolve(null),
      ]);
    return {
      summary: new DashboardController(store).summarize(
        entries,
        range,
        supplierEntries,
      ),
      transactions: mode === "dashboard" ? [...entries].reverse() : [],
      supplierTransactions: supplierRows.rows,
      supplierInsights,
    };
  }
}
