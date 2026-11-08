import { DashboardRange } from "../dashboard/period";
import { IDB } from "./Database";
import { ensureListings } from "./listing/maintenance";

export interface SupplierInsightRow {
  id: string;
  name: string;
  deletedAt?: number;
  purchases: number;
  purchaseCount: number;
  payments: number;
  paymentCount: number;
  lifetimePurchases: number;
  lifetimePayments: number;
}

/** Aggregate existing contact projection keys; only distinct contact records are hydrated. */
export default class SupplierInsightsStore {
  constructor(private readonly database: IDB) {}
  async getRows(range: DashboardRange): Promise<SupplierInsightRow[]> {
    const db = await this.database.getDatabase();
    await ensureListings(db, ["PURCHASES", "SUPPLIER_PAYMENTS"]);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        "PURCHASES",
        "SUPPLIER_PAYMENTS",
        "CUSTOMER",
      ]);
      const totals = new Map<string, Omit<SupplierInsightRow, "name">>();
      const rows: SupplierInsightRow[] = [];
      let pending = 2;
      const hydrateContacts = () => {
        if (--pending) return;
        // Queue these reads inside the final cursor callback to keep IndexedDB active.
        for (const row of totals.values()) {
          const request = transaction.objectStore("CUSTOMER").get(row.id);
          request.onsuccess = () => {
            const contact = request.result;
            if (contact && (range.includeDeleted || !contact.deletedAt))
              rows.push({
                ...row,
                name: contact.name,
                deletedAt: contact.deletedAt,
              });
          };
        }
      };
      transaction.oncomplete = () => resolve(rows);
      transaction.onabort = () => reject(transaction.error);
      for (const table of ["PURCHASES", "SUPPLIER_PAYMENTS"]) {
        const request = transaction
          .objectStore(table)
          .index("listDate")
          .openKeyCursor(
            IDBKeyRange.bound(['["contact",'], ['["contact",\uffff']),
          );
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            hydrateContacts();
            return;
          }
          const [scope, state, , timestamp, , amount] = cursor.key as [
            string,
            number,
            number,
            number,
            string,
            number,
          ];
          // Contact-only scopes appear once per visibility; skip their per-kind duplicates.
          if (
            state === (range.includeDeleted ? 1 : 0) &&
            scope.endsWith(",null]")
          ) {
            const id = (JSON.parse(scope) as [string, string, null])[1];
            const row = totals.get(id) ?? {
              id,
              purchases: 0,
              purchaseCount: 0,
              payments: 0,
              paymentCount: 0,
              lifetimePurchases: 0,
              lifetimePayments: 0,
            };
            const selected =
              range.all || (timestamp >= range.start && timestamp < range.end);
            if (table === "PURCHASES") {
              row.lifetimePurchases += amount;
              if (selected) {
                row.purchases += amount;
                row.purchaseCount++;
              }
            } else {
              row.lifetimePayments += amount;
              if (selected) {
                row.payments += amount;
                row.paymentCount++;
              }
            }
            totals.set(id, row);
          }
          cursor.continue();
        };
      }
    });
  }
}
