import { ensureListings } from "./listing/maintenance";
import {
  indexedHeader,
  createListingIndexes,
  contactScope,
  invoiceScope,
} from "./listing/metadata";
import readListingPage from "./listing/readPage";
import {
  createPurchaseInvoice,
  normalizePurchaseInvoices,
} from "../purchasing/invoice";
import { v4 as uuid } from "uuid";
import ObjectStore from "./ObjectStore";
import { IDB } from "./Database";
import {
  PurchaseSchema,
  PurchaseLineSchema,
  SupplierPaymentSchema,
  PurchaseInput,
} from "../models/Purchase";
import { getLocaleText } from "../localization/locale";
import { loadSettings } from "../settings/settings";
import { roundQuantity, validQuantity } from "../validators/QuantityValidator";
import { publishStockChange } from "../stock/events";
import { PageOptions } from "./Pagination";
import { DashboardRange } from "../dashboard/period";
import { DELETION_UPDATED } from "../deletion/state";
class RecordStore<T> extends ObjectStore<T, T> {
  constructor(
    db: IDB,
    name: string,
    private readonly indexes: string[],
  ) {
    super(db, name);
  }
  onObjectStoreCreation(store: IDBObjectStore) {
    if (this.getObjectStoreName() !== "PURCHASE_LINES")
      createListingIndexes(store);
    for (const key of this.indexes)
      store.createIndex(key, key, {
        unique:
          key === "id" ||
          (this.getObjectStoreName() === "PURCHASES" && key === "reference"),
      });
  }
  onDatabaseUpgrade(
    database: IDBDatabase,
    transaction: IDBTransaction,
    oldVersion: number,
  ) {
    const store = transaction.objectStore(this.getObjectStoreName());
    if (this.getObjectStoreName() !== "PURCHASE_LINES")
      createListingIndexes(store);
    if (this.getObjectStoreName() === "PURCHASES" && oldVersion < 9) {
      // Repair old blanks and reused references before enforcing the unique index.
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = normalizePurchaseInvoices(
          request.result as PurchaseSchema[],
        );
        if (store.indexNames.contains("reference"))
          store.deleteIndex("reference");
        let pending = rows.length;
        const createIndex = () =>
          store.createIndex("reference", "reference", { unique: true });
        if (!pending) createIndex();
        for (const row of rows) {
          const put = store.put(indexedHeader(row, "purchase"));
          put.onsuccess = () => {
            if (--pending === 0) createIndex();
          };
        }
      };
    }
    for (const key of this.indexes) {
      if (key === "reference" && oldVersion < 9) continue;
      if (!store.indexNames.contains(key))
        store.createIndex(key, key, {
          unique:
            key === "id" ||
            (this.getObjectStoreName() === "PURCHASES" && key === "reference"),
        });
    }
  }
  getObjectAsSchema(value: T) {
    return value;
  }
  async getSchemaAsObject(value: T) {
    return value;
  }
}
export interface PurchasingRow {
  id: string;
  contactId: string;
  contactName: string;
  timestamp: number;
  reference: string;
  total: number;
  kind: "purchase" | "supplier-payment";
  deletedAt?: number;
}
export default class PurchasingOS {
  readonly purchases: RecordStore<PurchaseSchema>;
  readonly lines: RecordStore<PurchaseLineSchema>;
  readonly payments: RecordStore<SupplierPaymentSchema>;
  constructor(private readonly database: IDB) {
    this.purchases = new RecordStore(database, "PURCHASES", [
      "id",
      "timestamp",
      "contactId",
      "reference",
    ]);
    this.lines = new RecordStore(database, "PURCHASE_LINES", [
      "id",
      "purchaseId",
      "productId",
    ]);
    this.payments = new RecordStore(database, "SUPPLIER_PAYMENTS", [
      "id",
      "timestamp",
      "contactId",
    ]);
  }
  async receive(input: PurchaseInput) {
    const settings = loadSettings();
    if (
      !settings.purchasing ||
      !input.lines.length ||
      !Number.isFinite(input.timestamp)
    )
      throw new Error(getLocaleText("BUY_INVALID"));
    const lines = input.lines.map((line) => {
      if (
        !validQuantity(line.quantity) ||
        !Number.isFinite(line.unitCost) ||
        line.unitCost < 0 ||
        Math.abs(line.unitCost * 100 - Math.round(line.unitCost * 100)) >
          0.00001
      )
        throw new Error(getLocaleText("BUY_INVALID"));
      const total = Math.round(line.quantity * line.unitCost * 100) / 100;
      if (!Number.isSafeInteger(Math.round(total * 100)))
        throw new Error(getLocaleText("BUY_INVALID"));
      return { ...line, id: uuid(), name: "", total };
    });
    const reference = input.reference.trim() || createPurchaseInvoice();
    const id = uuid(),
      total =
        Math.round(
          lines.reduce((sum, line) => sum + Math.round(line.total * 100), 0),
        ) / 100;
    if (!Number.isSafeInteger(Math.round(total * 100)))
      throw new Error(getLocaleText("BUY_INVALID"));
    const db = await this.database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["CUSTOMER", "PRODUCTS", "STOCK", "PURCHASES", "PURCHASE_LINES"],
        "readwrite",
      );
      tx.oncomplete = () => resolve();
      let failureKey: "BUY_SAVE_FAILED" | "BUY_INVOICE_DUPLICATE" =
        "BUY_SAVE_FAILED";
      tx.onabort = () => reject(new Error(getLocaleText(failureKey)));
      // The check and insert share a write transaction, including across tabs.
      // The unique database index also protects writes through other entry points.
      const duplicate = tx
        .objectStore("PURCHASES")
        .index("reference")
        .count(reference);
      duplicate.onsuccess = () => {
        if (duplicate.result) {
          failureKey = "BUY_INVOICE_DUPLICATE";
          tx.abort();
          return;
        }
        const contact = tx.objectStore("CUSTOMER").get(input.contactId);
        contact.onsuccess = () => {
          if (!contact.result || contact.result.deletedAt) {
            tx.abort();
            return;
          }
          tx.objectStore("PURCHASES").add(
            indexedHeader(
              {
                id,
                contactId: input.contactId,
                contactName: contact.result.name,
                timestamp: input.timestamp,
                reference,
                total,
                stockApplied: settings.stockManagement ? 1 : 0,
              },
              "purchase",
            ),
          );
          // Process lines serially so repeated products cannot overwrite one another's stock additions.
          let index = 0;
          const next = () => {
            const line = lines[index++];
            if (!line) return;
            const item = tx.objectStore("PRODUCTS").get(line.productId);
            item.onsuccess = () => {
              if (
                !item.result ||
                item.result.deletedAt ||
                item.result.canPurchase === 0
              ) {
                tx.abort();
                return;
              }
              tx.objectStore("PURCHASE_LINES").add({
                ...line,
                purchaseId: id,
                name: item.result.name,
              });
              if (!settings.stockManagement) {
                next();
                return;
              }
              const stock = tx.objectStore("STOCK"),
                request = stock.get(line.productId);
              request.onsuccess = () => {
                const count = roundQuantity(
                  (request.result?.count ?? 0) + line.quantity,
                );
                if (!validQuantity(Math.abs(count), true)) {
                  tx.abort();
                  return;
                }
                const put = stock.put({ id: line.productId, count });
                put.onsuccess = next;
              };
            };
          };
          next();
        };
      };
    });
    publishStockChange();
    window.dispatchEvent(new Event(DELETION_UPDATED));
    return id;
  }
  async pay(
    contactId: string,
    amount: number,
    timestamp: number,
    reference: string,
  ) {
    if (
      !loadSettings().purchasing ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 ||
      !Number.isFinite(timestamp)
    )
      throw new Error(getLocaleText("BUY_INVALID"));
    const db = await this.database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["CUSTOMER", "SUPPLIER_PAYMENTS"], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error(getLocaleText("BUY_SAVE_FAILED")));
      const contact = tx.objectStore("CUSTOMER").get(contactId);
      contact.onsuccess = () => {
        if (!contact.result || contact.result.deletedAt) {
          tx.abort();
          return;
        }
        tx.objectStore("SUPPLIER_PAYMENTS").add(
          indexedHeader(
            {
              id: uuid(),
              contactId,
              contactName: contact.result.name,
              timestamp,
              reference: reference.trim(),
              amount,
            },
            "supplier-payment",
          ),
        );
      };
    });
    window.dispatchEvent(new Event(DELETION_UPDATED));
  }
  async getPage(
    options: PageOptions,
    range: DashboardRange,
    contactId?: string,
    kind = "all",
  ) {
    const db = await this.database.getDatabase();
    const names =
      kind === "purchase"
        ? ["PURCHASES"]
        : kind === "supplier-payment"
          ? ["SUPPLIER_PAYMENTS"]
          : ["PURCHASES", "SUPPLIER_PAYMENTS"];
    await ensureListings(db, names);
    const tx = db.transaction(names);
    const result = await readListingPage<
      PurchaseSchema | SupplierPaymentSchema
    >(
      names.map((name) => tx.objectStore(name)),
      options,
      range,
      contactId ? contactScope(contactId) : "all",
    );
    return {
      ...result,
      rows: result.rows.map((row) => ({
        ...row,
        kind:
          "amount" in row
            ? ("supplier-payment" as const)
            : ("purchase" as const),
        total: "amount" in row ? -row.amount : row.total,
      })),
    };
  }
  async getPurchasePayments(
    contactId: string,
    reference: string,
    options: PageOptions,
  ) {
    const db = await this.database.getDatabase();
    await ensureListings(db, ["SUPPLIER_PAYMENTS"]);
    return readListingPage<SupplierPaymentSchema>(
      [db.transaction("SUPPLIER_PAYMENTS").objectStore("SUPPLIER_PAYMENTS")],
      { ...options, includeDeleted: false },
      { start: 0, end: Number.MAX_SAFE_INTEGER, all: true },
      invoiceScope(contactId, reference),
    );
  }
  async balance(contactId: string, includeDeleted = false) {
    const db = await this.database.getDatabase();
    await ensureListings(db, ["PURCHASES", "SUPPLIER_PAYMENTS"]);
    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(["PURCHASES", "SUPPLIER_PAYMENTS"]);
      const state = includeDeleted ? 1 : 0,
        scope = contactScope(contactId);
      const bound = IDBKeyRange.bound([scope, state], [scope, state, []]);
      let total = 0;
      tx.onabort = () => reject(tx.error);
      tx.oncomplete = () => resolve(total);
      for (const name of ["PURCHASES", "SUPPLIER_PAYMENTS"]) {
        const request = tx
          .objectStore(name)
          .index("listAmount")
          .openKeyCursor(bound);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const amount = (cursor.key as [string, number, number])[2];
          total += name === "PURCHASES" ? amount : -amount;
          cursor.continue();
        };
      }
    });
  }
}
