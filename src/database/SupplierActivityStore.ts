import { DashboardRange } from "../dashboard/period";
import { IDB } from "./Database";
import { ensureListings } from "./listing/maintenance";

export interface SupplierActivityEntry {
  timestamp: number;
  total: number;
  kind: "purchase" | "supplier-payment";
}

/** Summaries read compact keys; supplier record values are only needed in detail tables. */
export default class SupplierActivityStore {
  constructor(private readonly database: IDB) {}
  async getEntries(range: DashboardRange): Promise<SupplierActivityEntry[]> {
    const db = await this.database.getDatabase();
    await ensureListings(db, ["PURCHASES", "SUPPLIER_PAYMENTS"]);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["PURCHASES", "SUPPLIER_PAYMENTS"]);
      const entries: SupplierActivityEntry[] = [];
      transaction.oncomplete = () => resolve(entries);
      transaction.onabort = () => reject(transaction.error);
      for (const [table, kind] of [
        ["PURCHASES", "purchase"],
        ["SUPPLIER_PAYMENTS", "supplier-payment"],
      ] as const) {
        const state = range.includeDeleted ? 1 : 0;
        const bound = range.all
          ? IDBKeyRange.bound(["all", state], ["all", state, []])
          : IDBKeyRange.bound(
              ["all", state, range.start],
              ["all", state, range.end],
              false,
              true,
            );
        const request = transaction
          .objectStore(table)
          .index("listDate")
          .openKeyCursor(bound);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const key = cursor.key as [
            string,
            number,
            number,
            number,
            string,
            number,
          ];
          entries.push({ timestamp: key[3], total: key[5], kind });
          cursor.continue();
        };
      }
    });
  }
}
