import { IDataBaseContext } from "../database/DatabaseStores";
import DashboardOS from "../database/DashboardOS";
import DashboardController from "./DashboardController";
import { DashboardRange } from "../dashboard/period";

/** Whole-report tables and aggregates derive from one consistent database snapshot. */
export default class PrintReportsController {
  constructor(private readonly stores: IDataBaseContext) {}
  async getReport(range: DashboardRange, mode: "dashboard" | "overview") {
    const store = new DashboardOS(this.stores.database);
    const entries = await store.getEntries(range);
    return {
      summary: new DashboardController(store).summarize(entries, range),
      sales:
        mode === "dashboard"
          ? entries.filter((row) => row.kind !== "payment").reverse()
          : [],
      payments:
        mode === "dashboard"
          ? entries.filter((row) => row.kind === "payment").reverse()
          : [],
    };
  }
}
