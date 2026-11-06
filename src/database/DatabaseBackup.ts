import { markListingsReady } from "./listing/maintenance";
import { prepareListingRestore } from "./listing/restore";
import { withoutListing } from "./listing/metadata";
import { normalizePurchaseInvoices } from "../purchasing/invoice";
import { DATABASE_VERSION } from "./Database";
import { validQuantity } from "../validators/QuantityValidator";
import { BackupProgress } from "../backup/progress";
import {
  markRestoreStarted,
  clearRestoreStatus,
} from "../backup/restoreStatus";
import { getLocaleText } from "../contexts/Locale";
import { IDB } from "./Database";

export type BackupRow = Record<string, string | number>;
export interface DatabaseBackup {
  format: "pos-database-backup";
  formatVersion: 1;
  databaseVersion: number;
  sourceDatabase: string;
  createdAt: string;
  tables: Record<string, BackupRow[]>;
}

/** Stored field definitions, rather than reconstructed model data. */
const tableFields: Record<string, Record<string, "string" | "number">> = {
  PURCHASES: {
    id: "string",
    contactId: "string",
    contactName: "string",
    timestamp: "number",
    reference: "string",
    total: "number",
    stockApplied: "number",
  },
  PURCHASE_LINES: {
    id: "string",
    purchaseId: "string",
    productId: "string",
    name: "string",
    quantity: "number",
    unitCost: "number",
    total: "number",
  },
  SUPPLIER_PAYMENTS: {
    id: "string",
    contactId: "string",
    contactName: "string",
    timestamp: "number",
    reference: "string",
    amount: "number",
  },
  STOCK: { id: "string", count: "number" },
  CUSTOMER_TRANSACTION_SUMMARIES: {
    id: "string",
    timestamp: "number",
    count: "number",
    total: "number",
  },
  ITEM_PRICE_CHANGES: {
    id: "string",
    itemId: "string",
    amount: "number",
    timestamp: "number",
  },
  PRODUCTS: { id: "string", name: "string", amount: "number" },
  CUSTOMER: { id: "string", name: "string", phoneNumber: "string" },
  DISCOUNTS: {
    id: "string",
    name: "string",
    amount: "number",
    discountType: "number",
  },
  TRANSACTIONS: { id: "string", timestamp: "number", total: "number" },
  TRANSACTION_PRODUCTS: {
    id: "string",
    transactionId: "string",
    productId: "string",
    quantity: "number",
  },
  TRANSACTION_DISCOUNTS: {
    id: "string",
    transactionId: "string",
    discountId: "string",
    quantity: "number",
  },
  CUSTOMERS_TRANSACTIONS: {
    id: "string",
    timestamp: "number",
    customerId: "string",
    transactionId: "string",
  },
};
const references = [
  ["PURCHASES", "contactId", "CUSTOMER"],
  ["PURCHASE_LINES", "purchaseId", "PURCHASES"],
  ["PURCHASE_LINES", "productId", "PRODUCTS"],
  ["SUPPLIER_PAYMENTS", "contactId", "CUSTOMER"],
  ["STOCK", "id", "PRODUCTS"],
  ["CUSTOMER_TRANSACTION_SUMMARIES", "id", "CUSTOMER"],
  ["ITEM_PRICE_CHANGES", "itemId", "PRODUCTS"],
  ["TRANSACTION_PRODUCTS", "transactionId", "TRANSACTIONS"],
  ["TRANSACTION_PRODUCTS", "productId", "PRODUCTS"],
  ["TRANSACTION_DISCOUNTS", "transactionId", "TRANSACTIONS"],
  ["TRANSACTION_DISCOUNTS", "discountId", "DISCOUNTS"],
  ["CUSTOMERS_TRANSACTIONS", "customerId", "CUSTOMER"],
  ["CUSTOMERS_TRANSACTIONS", "transactionId", "TRANSACTIONS"],
];
const validMoney = (value: unknown) =>
  typeof value === "number" &&
  value >= 0 &&
  Number.isSafeInteger(Math.round(value * 100)) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function validateBackup(value: unknown): DatabaseBackup {
  if (
    !isObject(value) ||
    value.format !== "pos-database-backup" ||
    value.formatVersion !== 1 ||
    (value.databaseVersion !== 1 &&
      value.databaseVersion !== 2 &&
      value.databaseVersion !== 3 &&
      value.databaseVersion !== 4 &&
      value.databaseVersion !== 5 &&
      value.databaseVersion !== 6 &&
      value.databaseVersion !== 7 &&
      value.databaseVersion !== 8 &&
      value.databaseVersion !== 9 &&
      value.databaseVersion !== 10 &&
      value.databaseVersion !== 11 &&
      value.databaseVersion !== 12 &&
      value.databaseVersion !== 13 &&
      value.databaseVersion !== DATABASE_VERSION) ||
    typeof value.sourceDatabase !== "string" ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !isObject(value.tables)
  ) {
    throw new Error(
      getLocaleText("UI_THIS_IS_NOT_A_SUPPORTED_POS_DATABASE_BACKUP"),
    );
  }
  const legacyInvoices = (value.databaseVersion as number) < 9;
  const legacy = (value.databaseVersion as number) < 3;
  const tables: Record<string, unknown> = { ...value.tables };
  if (value.databaseVersion === 1) tables.ITEM_PRICE_CHANGES = [];
  if (legacy) tables.CUSTOMER_TRANSACTION_SUMMARIES = [];
  if ((value.databaseVersion as number) < 4) tables.STOCK = [];
  if ((value.databaseVersion as number) < 6) {
    tables.PURCHASES = [];
    tables.PURCHASE_LINES = [];
    tables.SUPPLIER_PAYMENTS = [];
  }
  value = { ...value, databaseVersion: DATABASE_VERSION, tables };
  if (Object.keys(tables).length !== Object.keys(tableFields).length)
    throw new Error(
      getLocaleText("UI_BACKUP_MUST_CONTAIN_EVERY_DATABASE_TABLE"),
    );
  const ids: Record<string, Set<string>> = {};
  for (const [name, fields] of Object.entries(tableFields)) {
    const rows = tables[name];
    if (!Array.isArray(rows))
      throw new Error(
        getLocaleText("UI_MISSING_TABLE_VALUE", { value0: name }),
      );
    ids[name] = new Set();
    const timestamps = new Set<number>();
    const priceKeys = new Set<string>();
    const invoices = new Set<string>();
    for (const row of rows) {
      if (!isObject(row))
        throw new Error(
          getLocaleText("UI_INVALID_RECORD_IN_VALUE", { value0: name }),
        );
      for (const [field, type] of Object.entries(fields)) {
        if (
          typeof row[field] !== type ||
          (type === "number" && !Number.isFinite(row[field]))
        )
          throw new Error(
            getLocaleText("UI_INVALID_VALUE_VALUE", {
              value0: name,
              value1: field,
            }),
          );
      }
      if (
        name === "TRANSACTIONS" &&
        row.kind !== undefined &&
        row.kind !== "sale" &&
        row.kind !== "payment"
      )
        throw new Error(getLocaleText("PAYMENT_INVALID"));
      if (
        name === "TRANSACTIONS" &&
        row.kind === "payment" &&
        (row.total as number) >= 0
      )
        throw new Error(getLocaleText("PAYMENT_INVALID"));
      if (
        row.deletedAt !== undefined &&
        (typeof row.deletedAt !== "number" ||
          !Number.isFinite(row.deletedAt) ||
          row.deletedAt <= 0)
      )
        throw new Error(getLocaleText("DELETE_INVALID_METADATA"));
      if (
        name === "TRANSACTIONS" &&
        ["stockDeducted", "stockReversed"].some(
          (key) => row[key] !== undefined && row[key] !== 0 && row[key] !== 1,
        )
      )
        throw new Error(getLocaleText("DELETE_INVALID_METADATA"));
      if (name === "STOCK" && !validQuantity(Math.abs(Number(row.count)), true))
        throw new Error(getLocaleText("STOCK_INVALID"));
      if (
        name === "PRODUCTS" &&
        ["canSell", "canPurchase"].some(
          (key) => row[key] !== undefined && row[key] !== 0 && row[key] !== 1,
        )
      )
        throw new Error(getLocaleText("BUY_INVALID"));
      if (
        name === "PURCHASES" &&
        (!validMoney(row.total) ||
          (row.stockApplied !== 0 && row.stockApplied !== 1) ||
          (row.stockReversed !== undefined &&
            row.stockReversed !== 0 &&
            row.stockReversed !== 1))
      )
        throw new Error(getLocaleText("BUY_INVALID"));
      if (
        name === "SUPPLIER_PAYMENTS" &&
        (!validMoney(row.amount) || Number(row.amount) <= 0)
      )
        throw new Error(getLocaleText("BUY_INVALID"));
      if (
        name === "PURCHASE_LINES" &&
        (!validQuantity(Number(row.quantity)) ||
          !validMoney(row.unitCost) ||
          !validMoney(row.total) ||
          Math.abs(
            Number(row.total) -
              Math.round(Number(row.quantity) * Number(row.unitCost) * 100) /
                100,
          ) > 0.000001)
      )
        throw new Error(getLocaleText("BUY_INVALID"));
      if (name === "PURCHASES" && !legacyInvoices) {
        const reference = row.reference as string;
        if (
          !reference.trim() ||
          reference !== reference.trim() ||
          invoices.has(reference)
        )
          throw new Error(getLocaleText("BUY_INVOICE_INVALID"));
        invoices.add(reference);
      }
      const id = row.id as string;
      if (!id || ids[name].has(id))
        throw new Error(
          getLocaleText("UI_MISSING_OR_DUPLICATE_ID_IN_VALUE", {
            value0: name,
          }),
        );
      ids[name].add(id);
      if (
        "timestamp" in fields &&
        name !== "PURCHASES" &&
        name !== "SUPPLIER_PAYMENTS" &&
        name !== "ITEM_PRICE_CHANGES" &&
        name !== "CUSTOMER_TRANSACTION_SUMMARIES"
      ) {
        const timestamp = row.timestamp as number;
        if (timestamps.has(timestamp))
          throw new Error(
            getLocaleText("UI_DUPLICATE_TIMESTAMP_IN_VALUE", { value0: name }),
          );
        timestamps.add(timestamp);
      }
      if (name === "ITEM_PRICE_CHANGES") {
        const key = JSON.stringify([row.itemId, row.timestamp]);
        if (priceKeys.has(key))
          throw new Error(getLocaleText("UI_DUPLICATE_ITEM_PRICE_TIMESTAMP"));
        priceKeys.add(key);
      }
      if (
        name === "ITEM_PRICE_CHANGES" &&
        ((row.amount as number) < 0 || (row.timestamp as number) < 0)
      )
        throw new Error(getLocaleText("UI_INVALID_PRICE_HISTORY"));
      if (
        name === "DISCOUNTS" &&
        row.discountType !== 0 &&
        row.discountType !== 1
      )
        throw new Error(getLocaleText("UI_INVALID_DISCOUNT_TYPE"));
      if ("quantity" in fields && (row.quantity as number) <= 0)
        throw new Error(
          getLocaleText("UI_INVALID_QUANTITY_IN_VALUE", { value0: name }),
        );
    }
  }
  if (legacyInvoices)
    tables.PURCHASES = normalizePurchaseInvoices(
      tables.PURCHASES as (BackupRow & { reference: string })[],
    );
  for (const [table, field, target] of references) {
    for (const row of tables[table] as BackupRow[]) {
      if (!ids[target].has(row[field] as string))
        throw new Error(
          getLocaleText("UI_BROKEN_RELATIONSHIP_VALUE_VALUE", {
            value0: table,
            value1: field,
          }),
        );
    }
  }
  const purchaseTotals = new Map<string | number, number>();
  for (const line of tables.PURCHASE_LINES as BackupRow[])
    purchaseTotals.set(
      line.purchaseId,
      (purchaseTotals.get(line.purchaseId) ?? 0) +
        Math.round(Number(line.total) * 100),
    );
  for (const purchase of tables.PURCHASES as BackupRow[])
    if (
      !purchaseTotals.has(purchase.id) ||
      Math.abs(
        Number(purchase.total) - (purchaseTotals.get(purchase.id) ?? 0) / 100,
      ) > 0.000001
    )
      throw new Error(getLocaleText("BUY_INVALID"));
  // Build these once: rescanning every line/link for every payment is quadratic on large backups.
  const activeLinkCounts = new Map<string | number, number>();
  for (const link of tables.CUSTOMERS_TRANSACTIONS as BackupRow[]) {
    if (!link.deletedAt)
      activeLinkCounts.set(
        link.transactionId,
        (activeLinkCounts.get(link.transactionId) ?? 0) + 1,
      );
  }
  const transactionsWithLines = new Set<string | number>();
  for (const name of ["TRANSACTION_PRODUCTS", "TRANSACTION_DISCOUNTS"]) {
    for (const line of tables[name] as BackupRow[])
      transactionsWithLines.add(line.transactionId);
  }
  // Payments may be explicitly unlinked, but cannot have multiple active customers or sale lines.
  for (const payment of tables.TRANSACTIONS as BackupRow[]) {
    if (payment.kind !== "payment") continue;
    if (
      (activeLinkCounts.get(payment.id) ?? 0) > 1 ||
      transactionsWithLines.has(payment.id)
    )
      throw new Error(getLocaleText("PAYMENT_INVALID"));
  }
  // Summary rows are derived from canonical links and saved totals, never trusted blindly.
  const sales = new Map(
    (tables.TRANSACTIONS as BackupRow[])
      .filter((row) => !row.deletedAt)
      .map((row) => [row.id, Number(row.total)]),
  );
  const summaries = new Map<string, BackupRow>();
  for (const link of tables.CUSTOMERS_TRANSACTIONS as BackupRow[]) {
    if (link.deletedAt || !sales.has(link.transactionId)) continue;
    const id = String(link.customerId);
    const summary = summaries.get(id) || {
      id,
      timestamp: 0,
      count: 0,
      total: 0,
    };
    summary.count = Number(summary.count) + 1;
    summary.total = Number(summary.total) + sales.get(link.transactionId)!;
    summary.timestamp = Math.max(
      Number(summary.timestamp),
      Number(link.timestamp),
    );
    summaries.set(id, summary);
  }
  const expected = Array.from(summaries.values());
  if (legacy) tables.CUSTOMER_TRANSACTION_SUMMARIES = expected;
  else {
    const actual = tables.CUSTOMER_TRANSACTION_SUMMARIES as BackupRow[];
    if (
      actual.length !== expected.length ||
      actual.some((row) => {
        const match = summaries.get(String(row.id));
        return (
          !match ||
          row.count !== match.count ||
          row.timestamp !== match.timestamp ||
          Math.abs(Number(row.total) - Number(match.total)) > 0.0000001
        );
      })
    )
      throw new Error(getLocaleText("PAGINATION_SUMMARY_INVALID"));
  }
  // Archives contain canonical data. Ignore any supplied internal query keys.
  for (const name of [
    "TRANSACTIONS",
    "PURCHASES",
    "SUPPLIER_PAYMENTS",
    "PRODUCTS",
    "CUSTOMER",
    "CUSTOMER_TRANSACTION_SUMMARIES",
    "ITEM_PRICE_CHANGES",
    "CUSTOMERS_TRANSACTIONS",
  ]) {
    tables[name] = (tables[name] as BackupRow[]).map((row) =>
      "listDate" in row || "catalogKeys" in row || "activeLink" in row
        ? withoutListing(row)
        : row,
    );
  }
  return value as unknown as DatabaseBackup;
}

export interface RestoreProgress {
  completed: number;
  total: number;
  phase: "validating" | "writing" | "verifying";
  table?: string;
}

/** Persistence boundary for complete, consistent snapshots and atomic replacement. */
export default class DatabaseBackupStore {
  constructor(private readonly database: IDB) {}

  /** One consistent snapshot, emitted as bounded per-table JSON parts. No full database clone. */
  public async exportParts(
    write: (table: string, part: number, json: string, count: number) => void,
    onProgress?: (progress: BackupProgress) => void,
  ) {
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    return new Promise<{
      databaseVersion: number;
      sourceDatabase: string;
      createdAt: string;
    }>((resolve, reject) => {
      const transaction = db.transaction(names, "readonly");
      let failure: unknown;
      transaction.oncomplete = () =>
        resolve({
          databaseVersion: db.version,
          sourceDatabase: db.name,
          createdAt: new Date().toISOString(),
        });
      transaction.onabort = () =>
        reject(
          failure ||
            new Error(getLocaleText("UI_UNABLE_TO_READ_THE_DATABASE_BACKUP")),
        );
      let total = 0,
        completed = 0,
        pending = names.length;
      onProgress?.({ completed, total, phase: "preparing" });
      const readTable = (name: string) => {
        let rows: string[] = [],
          bytes = 2,
          part = 0;
        const encoder = new TextEncoder();
        const flush = () => {
          write(name, ++part, `[${rows.join(",")}]`, rows.length);
          completed += rows.length;
          onProgress?.({ completed, total, phase: "packing" });
          rows = [];
          bytes = 2;
        };
        const cursor = transaction.objectStore(name).openCursor();
        cursor.onsuccess = () => {
          try {
            const entry = cursor.result;
            if (!entry) {
              if (rows.length || !part) flush();
              return;
            }
            const json = JSON.stringify(withoutListing(entry.value));
            const size = encoder.encode(json).byteLength + 1;
            if (
              rows.length &&
              (rows.length >= 1000 || bytes + size > 1024 * 1024)
            )
              flush();
            rows.push(json);
            bytes += size;
            entry.continue();
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };
      };
      for (const name of names) {
        const count = transaction.objectStore(name).count();
        count.onsuccess = () => {
          total += count.result;
          if (!--pending) {
            onProgress?.({ completed, total, phase: "packing" });
            for (const table of names) readTable(table);
          }
        };
      }
    });
  }

  /** In-memory snapshot for internal consumers; downloadable backups use ZIP parts. */
  public async export(): Promise<DatabaseBackup> {
    const tables: DatabaseBackup["tables"] = {};
    const metadata = await this.exportParts((table, _part, json) => {
      const rows = (tables[table] ??= []);
      for (const row of JSON.parse(json) as BackupRow[]) rows.push(row);
    });
    return {
      format: "pos-database-backup",
      formatVersion: 1,
      ...metadata,
      tables,
    };
  }

  public async restore(
    value: unknown,
    onProgress?: (progress: RestoreProgress) => void,
  ): Promise<void> {
    onProgress?.({ completed: 0, total: 0, phase: "validating" });
    // Paint the pending state before validating a large in-memory archive.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const backup = validateBackup(value);
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    if (
      db.version !== backup.databaseVersion ||
      names.length !== Object.keys(backup.tables).length ||
      names.some(
        (name) => !Object.prototype.hasOwnProperty.call(backup.tables, name),
      )
    ) {
      throw new Error(
        getLocaleText("UI_BACKUP_SCHEMA_DOES_NOT_MATCH_THIS_DATABASE"),
      );
    }
    const prepareRow = prepareListingRestore(backup.tables);
    const total = names.reduce(
      (sum, name) => sum + backup.tables[name].length,
      0,
    );
    let completed = 0;
    markRestoreStarted(db.name);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(names, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => {
        clearRestoreStatus(db.name);
        reject(
          new Error(
            getLocaleText(
              transaction.error?.name === "QuotaExceededError"
                ? "RESTORE_QUOTA"
                : "UI_RESTORE_FAILED_THE_ORIGINAL_DATABASE_HAS_BEEN_KEPT",
            ),
          ),
        );
      };
      let tableIndex = 0,
        offset = 0;
      const report = () =>
        onProgress?.({
          completed,
          total,
          phase: "writing",
          table: names[tableIndex],
        });
      // A success callback queues the next small group while the SAME transaction is active.
      // Never await a timer between groups: that could commit a partly replaced database.
      const writeNext = () => {
        try {
          if (tableIndex >= names.length) return;
          const name = names[tableIndex];
          const store = transaction.objectStore(name);
          const rows = backup.tables[name];
          const end = Math.min(offset + 200, rows.length);
          if (offset === end) {
            tableIndex++;
            offset = 0;
            report();
            writeNext();
            return;
          }
          let last: IDBRequest | undefined;
          const count = end - offset;
          for (; offset < end; offset++)
            last = store.add(prepareRow(name, rows[offset]));
          last!.onsuccess = () => {
            completed += count;
            report();
            writeNext();
          };
        } catch {
          transaction.abort();
        }
      };
      // Clear requests are also bounded to the number of stores, not the number of records.
      let clears = names.length;
      for (const name of names) {
        const request = transaction.objectStore(name).clear();
        request.onsuccess = () => {
          if (!--clears) {
            report();
            writeNext();
          }
        };
      }
    });
    markListingsReady(db);
    onProgress?.({ completed: total, total, phase: "verifying" });
    const counts = await new Promise<Record<string, number>>(
      (resolve, reject) => {
        const transaction = db.transaction(names);
        const result: Record<string, number> = {};
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () =>
          reject(new Error(getLocaleText("RESTORE_VERIFY_FAILED")));
        for (const name of names) {
          const request = transaction.objectStore(name).count();
          request.onsuccess = () => {
            result[name] = request.result;
          };
        }
      },
    );
    if (names.some((name) => counts[name] !== backup.tables[name].length))
      throw new Error(getLocaleText("RESTORE_VERIFY_FAILED"));
    clearRestoreStatus(db.name);
  }
}
