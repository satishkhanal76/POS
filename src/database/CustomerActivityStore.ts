import { ensureListings } from "./listing/maintenance";
import { contactScope } from "./listing/metadata";
import { IDB } from "./Database";
import { CustomerSchema } from "./CustomerOS";
import { CustomerSummarySchema } from "../models/CustomerTransactionSummary";
export interface ActivityCustomer extends CustomerSchema {
  total: number;
  count: number;
  timestamp: number;
}

/** Balances use compact query keys; contacts and saved transactions are not hydrated. */
export default class CustomerActivityStore {
  constructor(private readonly database: IDB) {}
  async getBalance(contactId: string, includeDeleted = false): Promise<number> {
    const database = await this.database.getDatabase();
    if (includeDeleted) await ensureListings(database, ["TRANSACTIONS"]);
    return new Promise((resolve, reject) => {
      if (!includeDeleted) {
        const request = database
          .transaction("CUSTOMER_TRANSACTION_SUMMARIES")
          .objectStore("CUSTOMER_TRANSACTION_SUMMARIES")
          .get(contactId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.total ?? 0);
      } else {
        let total = 0;
        const scope = contactScope(contactId);
        const request = database
          .transaction("TRANSACTIONS")
          .objectStore("TRANSACTIONS")
          .index("listAmount")
          .openKeyCursor(IDBKeyRange.bound([scope, 1], [scope, 1, []]));
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(total);
            return;
          }
          total += (
            cursor.key as [string, number, number, number, string, number]
          )[5];
          cursor.continue();
        };
      }
    });
  }
  async list(includeDeleted = false): Promise<ActivityCustomer[]> {
    const database = await this.database.getDatabase();
    await ensureListings(database, ['CUSTOMER', 'CUSTOMER_TRANSACTION_SUMMARIES', ...(includeDeleted ? ['TRANSACTIONS', 'CUSTOMERS_TRANSACTIONS'] : [])]);
    return new Promise((resolve, reject) => {
      const names = [
        "CUSTOMER",
        "CUSTOMER_TRANSACTION_SUMMARIES",
        ...(includeDeleted ? ["TRANSACTIONS", "CUSTOMERS_TRANSACTIONS"] : []),
      ];
      const transaction = database.transaction(names);
      const customers: CustomerSchema[] = [],
        totals = new Map<string, CustomerSummarySchema>();
      const state = includeDeleted ? 1 : 0;
      const contacts = transaction
        .objectStore("CUSTOMER")
        .index("catalogKeys")
        .openKeyCursor(IDBKeyRange.bound([state], [state, []]));
      contacts.onsuccess = () => {
        const cursor = contacts.result;
        if (!cursor) return;
        const key = cursor.key as [
          number,
          string,
          string,
          string,
          string,
          number,
          string,
        ];
        customers.push({
          id: key[3],
          name: key[4],
          phoneNumber: key[6],
          ...(key[5] ? { deletedAt: key[5] } : {}),
        });
        cursor.continue();
      };
      if (!includeDeleted) {
        const summaries = transaction
          .objectStore("CUSTOMER_TRANSACTION_SUMMARIES")
          .index("listDate")
          .openKeyCursor(IDBKeyRange.bound(["all", 0], ["all", 0, []]));
        summaries.onsuccess = () => {
          const cursor = summaries.result;
          if (!cursor) return;
          const key = cursor.key as [
            string,
            number,
            number,
            number,
            string,
            number,
            number,
          ];
          totals.set(key[4], {
            id: key[4],
            timestamp: key[3],
            total: key[5],
            count: key[6],
          });
          cursor.continue();
        };
      } else {
        const amounts = new Map<string, number>();
        const headers = transaction
          .objectStore("TRANSACTIONS")
          .index("listAmount")
          .openKeyCursor(IDBKeyRange.bound(["all", 1], ["all", 1, []]));
        headers.onsuccess = () => {
          const cursor = headers.result;
          if (cursor) {
            const key = cursor.key as [
              string,
              number,
              number,
              number,
              string,
              number,
            ];
            amounts.set(key[4], key[5]);
            cursor.continue();
            return;
          }
          const links = transaction
            .objectStore("CUSTOMERS_TRANSACTIONS")
            .index("activeLink")
            .openKeyCursor();
          links.onsuccess = () => {
            const entry = links.result;
            if (!entry) return;
            const [customerId, timestamp, transactionId] = entry.key as [
              string,
              number,
              string,
              string,
            ];
            const amount = amounts.get(transactionId);
            if (amount !== undefined) {
              const row = totals.get(customerId) ?? {
                id: customerId,
                total: 0,
                count: 0,
                timestamp: 0,
              };
              row.total += amount;
              row.count++;
              row.timestamp = Math.max(row.timestamp, timestamp);
              totals.set(row.id, row);
            }
            entry.continue();
          };
        };
      }
      transaction.onabort = () => reject(transaction.error);
      transaction.oncomplete = () =>
        resolve(
          customers.map((customer) => ({
            ...customer,
            total: totals.get(customer.id)?.total ?? 0,
            count: totals.get(customer.id)?.count ?? 0,
            timestamp: totals.get(customer.id)?.timestamp ?? 0,
          })),
        );
    });
  }
}
