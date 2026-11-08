import { PICKER_USAGE_UPDATED } from "../pickers/events";
import { IDB } from "./Database";
import { DELETION_UPDATED } from "../deletion/state";
import { PickerUsage, Usage } from "../pickers/types";

interface CachedUsage {
  expires: number;
  minute: number;
  promise: Promise<PickerUsage>;
}
let cache = new WeakMap<IDBDatabase, Map<boolean, CachedUsage>>();
const listening = new WeakSet<EventTarget>();

/** Rolling 30-day usage, never a full-history rebuild or persisted popularity table. */
export default class PickerUsageStore {
  constructor(private readonly database: IDB) {}
  async get(purchase: boolean, now = Date.now()): Promise<PickerUsage> {
    const db = await this.database.getDatabase();
    if (!listening.has(window)) {
      const invalidate = () => {
        cache = new WeakMap();
      };
      window.addEventListener(DELETION_UPDATED, invalidate);
      window.addEventListener(PICKER_USAGE_UPDATED, invalidate);
      listening.add(window);
    }
    let modes = cache.get(db);
    if (!modes) {
      modes = new Map();
      cache.set(db, modes);
    }
    const current = modes.get(purchase),
      minute = Math.floor(now / 60000);
    if (current && current.expires > Date.now() && current.minute === minute)
      return current.promise;
    const promise = this.read(db, purchase, now);
    const entry = { expires: Date.now() + 60000, minute, promise };
    modes.set(purchase, entry);
    void promise.catch(() => {
      if (modes!.get(purchase) === entry) modes!.delete(purchase);
    });
    return promise;
  }
  private read(
    database: IDBDatabase,
    purchase: boolean,
    now: number,
  ): Promise<PickerUsage> {
    return new Promise((resolve, reject) => {
      const headers = purchase ? "PURCHASES" : "TRANSACTIONS";
      const lines = purchase ? "PURCHASE_LINES" : "TRANSACTION_PRODUCTS";
      const transaction = database.transaction([
        headers,
        lines,
        ...(!purchase ? ["CUSTOMERS_TRANSACTIONS"] : []),
      ]);
      const result: PickerUsage = { items: new Map(), contacts: new Map() };
      const since = new Date(now);
      since.setDate(since.getDate() - 30);
      const bump = (map: Map<string, Usage>, id: string, timestamp: number) => {
        const previous = map.get(id);
        map.set(id, {
          count: (previous?.count ?? 0) + 1,
          latest: Math.max(previous?.latest ?? 0, timestamp),
        });
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error);
      const cursor = transaction
        .objectStore(headers)
        .index("timestamp")
        .openCursor(IDBKeyRange.bound(since.getTime(), now));
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        const row = entry.value;
        if (row.deletedAt || row.kind === "payment") {
          entry.continue();
          return;
        }
        let pending = purchase ? 1 : 2;
        const next = () => {
          if (!--pending) entry.continue();
        };
        const products = transaction
          .objectStore(lines)
          .index(purchase ? "purchaseId" : "transactionId")
          .getAll(row.id);
        products.onsuccess = () => {
          for (const id of new Set<string>(
            products.result.map(
              (line: { productId: string }) => line.productId,
            ),
          ))
            bump(result.items, id, row.timestamp);
          next();
        };
        if (purchase) bump(result.contacts, row.contactId, row.timestamp);
        else {
          const links = transaction
            .objectStore("CUSTOMERS_TRANSACTIONS")
            .index("transactionId")
            .getAll(row.id);
          links.onsuccess = () => {
            for (const id of new Set<string>(
              links.result
                .filter((link: { deletedAt?: number }) => !link.deletedAt)
                .map((link: { customerId: string }) => link.customerId),
            ))
              bump(result.contacts, id, row.timestamp);
            next();
          };
        }
      };
    });
  }
}
