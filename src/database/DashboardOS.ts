import SupplierActivityStore from "./SupplierActivityStore";
import { ensureListings } from "./listing/maintenance";
import { IDB } from "./Database";
import { TransactionsSchema } from "./TransactionsOS";
import { CustomerTransactionsSchema } from "./CustomersTransactionsOS";
import { TransactionProductSchema } from "./TransactionProductsOS";
import { DashboardRange } from "../dashboard/period";
import { kindScope } from "./listing/metadata";

export interface DashboardEntry extends TransactionsSchema {
  customerIds: string[];
  customers: {
    id: string;
    name: string;
    phoneNumber: string;
    deletedAt?: number;
  }[];
  units: number;
  products: {
    id: string;
    name: string;
    quantity: number;
    gross: number;
    deletedAt?: number;
  }[];
}
type CatalogProduct = {
  id: string;
  name: string;
  amount: number;
  deletedAt?: number;
};
type Customer = DashboardEntry["customers"][number];
type PriceBook = {
  product: CatalogProduct;
  changes: { timestamp: number; amount: number }[];
};

/** Aggregate the selected period from keys; keep record requests bounded and reuse catalog lookups. */
export default class DashboardOS {
  constructor(private readonly database: IDB) {}
  getSupplierEntries(range: DashboardRange) {
    return new SupplierActivityStore(this.database).getEntries(range);
  }
  async getEntries({
    start,
    end,
    all,
    includeDeleted,
  }: DashboardRange): Promise<DashboardEntry[]> {
    const db = await this.database.getDatabase();
    await ensureListings(db, ["TRANSACTIONS"]);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        "TRANSACTIONS",
        "CUSTOMERS_TRANSACTIONS",
        "TRANSACTION_PRODUCTS",
        "PRODUCTS",
        "ITEM_PRICE_CHANGES",
        "CUSTOMER",
      ]);
      const entries: DashboardEntry[] = [];
      const products = new Map<string, PriceBook>(),
        contacts = new Map<string, Customer | undefined>();
      const pendingProducts = new Map<string, ((book: PriceBook) => void)[]>();
      transaction.oncomplete = () =>
        resolve(entries.sort((a, b) => a.timestamp - b.timestamp));
      transaction.onabort = () => reject(transaction.error);
      const productFor = (id: string, accept: (book: PriceBook) => void) => {
        const cached = products.get(id);
        if (cached) {
          accept(cached);
          return;
        }
        const waiting = pendingProducts.get(id);
        if (waiting) {
          waiting.push(accept);
          return;
        }
        pendingProducts.set(id, [accept]);
        const product = transaction.objectStore("PRODUCTS").get(id);
        const changes = transaction
          .objectStore("ITEM_PRICE_CHANGES")
          .index("itemTimestamp")
          .getAll(
            IDBKeyRange.bound([id], [id, all ? Number.MAX_SAFE_INTEGER : end]),
          );
        changes.onsuccess = () => {
          if (!product.result) {
            transaction.abort();
            return;
          }
          const row = product.result;
          const book = {
            product: {
              id,
              name: row.name,
              amount: row.amount,
              deletedAt: row.deletedAt,
            },
            changes: changes.result.map(
              (change: { timestamp: number; amount: number }) => ({
                timestamp: change.timestamp,
                amount: change.amount,
              }),
            ),
          };
          products.set(id, book);
          const callbacks = pendingProducts.get(id)!;
          pendingProducts.delete(id);
          callbacks.forEach((callback) => callback(book));
        };
      };
      const contactFor = (
        id: string,
        accept: (contact: Customer | undefined) => void,
      ) => {
        if (contacts.has(id)) {
          accept(contacts.get(id));
          return;
        }
        const request = transaction.objectStore("CUSTOMER").get(id);
        request.onsuccess = () => {
          const row = request.result;
          const contact = row
            ? {
                id,
                name: row.name,
                phoneNumber: row.phoneNumber,
                deletedAt: row.deletedAt,
              }
            : undefined;
          contacts.set(id, contact);
          accept(contact);
        };
      };
      for (const kind of ["sale", "payment"] as const) {
        const scope = kindScope(kind),
          state = includeDeleted ? 1 : 0;
        const bound = all
          ? IDBKeyRange.bound([scope, state], [scope, state, []])
          : IDBKeyRange.bound(
              [scope, state, start],
              [scope, state, end],
              false,
              true,
            );
        const request = transaction
          .objectStore("TRANSACTIONS")
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
          const entry: DashboardEntry = {
            id: key[4],
            timestamp: key[3],
            total: key[5],
            kind,
            customerIds: [],
            customers: [],
            units: 0,
            products: [],
          };
          let pending = kind === "sale" ? 2 : 1;
          const done = () => {
            if (!--pending) {
              entries.push(entry);
              cursor.continue();
            }
          };
          if (includeDeleted) {
            pending++;
            const deleted = transaction
              .objectStore("TRANSACTIONS")
              .index("deletedTimestamp")
              .openKeyCursor(
                IDBKeyRange.bound([entry.timestamp], [entry.timestamp, []]),
              );
            deleted.onsuccess = () => {
              entry.deletedAt = (
                deleted.result?.key as [number, number] | undefined
              )?.[1];
              done();
            };
          }
          const links = transaction
            .objectStore("CUSTOMERS_TRANSACTIONS")
            .index("transactionId")
            .getAll(entry.id);
          links.onsuccess = () => {
            entry.customerIds = [
              ...new Set(
                (links.result as CustomerTransactionsSchema[])
                  .filter((link) => !link.deletedAt)
                  .map((link) => link.customerId),
              ),
            ];
            for (const id of entry.customerIds) {
              pending++;
              contactFor(id, (contact) => {
                if (contact) entry.customers.push(contact);
                done();
              });
            }
            done();
          };
          if (kind === "sale") {
            const lines = transaction
              .objectStore("TRANSACTION_PRODUCTS")
              .index("transactionId")
              .getAll(entry.id);
            lines.onsuccess = () => {
              for (const line of lines.result as TransactionProductSchema[]) {
                entry.units += line.quantity;
                pending++;
                productFor(line.productId, (book) => {
                  let low = 0,
                    high = book.changes.length;
                  while (low < high) {
                    const middle = (low + high) >>> 1;
                    if (book.changes[middle].timestamp <= entry.timestamp)
                      low = middle + 1;
                    else high = middle;
                  }
                  const amount = low
                    ? book.changes[low - 1].amount
                    : book.product.amount;
                  entry.products.push({
                    id: line.productId,
                    name: book.product.name,
                    deletedAt: book.product.deletedAt,
                    quantity: line.quantity,
                    gross: line.quantity * amount,
                  });
                  done();
                });
              }
              done();
            };
          }
        };
      }
    });
  }
}
