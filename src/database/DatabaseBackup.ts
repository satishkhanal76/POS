import { getLocaleText } from '../contexts/Locale';
import { IDB } from './Database';

export type BackupRow = Record<string, string | number>;
export interface DatabaseBackup {
  format: 'pos-database-backup';
  formatVersion: 1;
  databaseVersion: number;
  sourceDatabase: string;
  createdAt: string;
  tables: Record<string, BackupRow[]>;
}

/** Stored field definitions, rather than reconstructed model data. */
const tableFields: Record<string, Record<string, 'string' | 'number'>> = {
  STOCK: { id: 'string', count: 'number' },
  CUSTOMER_TRANSACTION_SUMMARIES: { id: 'string', timestamp: 'number', count: 'number', total: 'number' },
  ITEM_PRICE_CHANGES: { id: 'string', itemId: 'string', amount: 'number', timestamp: 'number' },
  PRODUCTS: { id: 'string', name: 'string', amount: 'number' },
  CUSTOMER: { id: 'string', name: 'string', phoneNumber: 'string' },
  DISCOUNTS: { id: 'string', name: 'string', amount: 'number', discountType: 'number' },
  TRANSACTIONS: { id: 'string', timestamp: 'number', total: 'number' },
  TRANSACTION_PRODUCTS: { id: 'string', transactionId: 'string', productId: 'string', quantity: 'number' },
  TRANSACTION_DISCOUNTS: { id: 'string', transactionId: 'string', discountId: 'string', quantity: 'number' },
  CUSTOMERS_TRANSACTIONS: { id: 'string', timestamp: 'number', customerId: 'string', transactionId: 'string' },
};
const references = [
  ['STOCK', 'id', 'PRODUCTS'],
  ['CUSTOMER_TRANSACTION_SUMMARIES', 'id', 'CUSTOMER'],
  ['ITEM_PRICE_CHANGES', 'itemId', 'PRODUCTS'],
  ['TRANSACTION_PRODUCTS', 'transactionId', 'TRANSACTIONS'],
  ['TRANSACTION_PRODUCTS', 'productId', 'PRODUCTS'],
  ['TRANSACTION_DISCOUNTS', 'transactionId', 'TRANSACTIONS'],
  ['TRANSACTION_DISCOUNTS', 'discountId', 'DISCOUNTS'],
  ['CUSTOMERS_TRANSACTIONS', 'customerId', 'CUSTOMER'],
  ['CUSTOMERS_TRANSACTIONS', 'transactionId', 'TRANSACTIONS'],
];
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function validateBackup(value: unknown): DatabaseBackup {
  if (!isObject(value) || value.format !== 'pos-database-backup' || value.formatVersion !== 1 || (value.databaseVersion !== 1 && value.databaseVersion !== 2 && value.databaseVersion !== 3 && value.databaseVersion !== 4 && value.databaseVersion !== 5)
    || typeof value.sourceDatabase !== 'string' || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !isObject(value.tables)) {
    throw new Error(getLocaleText('UI_THIS_IS_NOT_A_SUPPORTED_POS_DATABASE_BACKUP'));
  }
  const legacy = (value.databaseVersion as number) < 3;
  const tables: Record<string, unknown> = { ...value.tables };
  if (value.databaseVersion === 1) tables.ITEM_PRICE_CHANGES = [];
  if (legacy) tables.CUSTOMER_TRANSACTION_SUMMARIES = [];
  if ((value.databaseVersion as number) < 4) tables.STOCK = [];
  value = { ...value, databaseVersion: 5, tables };
  if (Object.keys(tables).length !== Object.keys(tableFields).length) throw new Error(getLocaleText('UI_BACKUP_MUST_CONTAIN_EVERY_DATABASE_TABLE'));
  const ids: Record<string, Set<string>> = {};
  for (const [name, fields] of Object.entries(tableFields)) {
    const rows = tables[name];
    if (!Array.isArray(rows)) throw new Error(getLocaleText('UI_MISSING_TABLE_VALUE', { value0: name }));
    ids[name] = new Set();
    const timestamps = new Set<number>();
    const priceKeys = new Set<string>();
    for (const row of rows) {
      if (!isObject(row)) throw new Error(getLocaleText('UI_INVALID_RECORD_IN_VALUE', { value0: name }));
      for (const [field, type] of Object.entries(fields)) {
        if (typeof row[field] !== type || (type === 'number' && !Number.isFinite(row[field]))) throw new Error(getLocaleText('UI_INVALID_VALUE_VALUE', { value0: name, value1: field }));
      }
      if (name === 'TRANSACTIONS' && row.kind !== undefined && row.kind !== 'sale' && row.kind !== 'payment') throw new Error(getLocaleText('PAYMENT_INVALID'));
      if (name === 'TRANSACTIONS' && row.kind === 'payment' && (row.total as number) >= 0) throw new Error(getLocaleText('PAYMENT_INVALID'));
      if (row.deletedAt !== undefined && (typeof row.deletedAt !== 'number' || !Number.isFinite(row.deletedAt) || row.deletedAt <= 0)) throw new Error(getLocaleText('DELETE_INVALID_METADATA'));
      if (name === 'TRANSACTIONS' && ['stockDeducted', 'stockReversed'].some(key => row[key] !== undefined && row[key] !== 0 && row[key] !== 1)) throw new Error(getLocaleText('DELETE_INVALID_METADATA'));
      if (name === 'STOCK' && !Number.isSafeInteger(row.count)) throw new Error(getLocaleText('STOCK_INVALID'));
      const id = row.id as string;
      if (!id || ids[name].has(id)) throw new Error(getLocaleText('UI_MISSING_OR_DUPLICATE_ID_IN_VALUE', { value0: name }));
      ids[name].add(id);
      if ('timestamp' in fields && name !== 'ITEM_PRICE_CHANGES' && name !== 'CUSTOMER_TRANSACTION_SUMMARIES') {
        const timestamp = row.timestamp as number;
        if (timestamps.has(timestamp)) throw new Error(getLocaleText('UI_DUPLICATE_TIMESTAMP_IN_VALUE', { value0: name }));
        timestamps.add(timestamp);
      }
      if (name === 'ITEM_PRICE_CHANGES') {
        const key = JSON.stringify([row.itemId, row.timestamp]);
        if (priceKeys.has(key)) throw new Error(getLocaleText('UI_DUPLICATE_ITEM_PRICE_TIMESTAMP'));
        priceKeys.add(key);
      }
      if (name === 'ITEM_PRICE_CHANGES' && ((row.amount as number) < 0 || (row.timestamp as number) < 0)) throw new Error(getLocaleText('UI_INVALID_PRICE_HISTORY'));
      if (name === 'DISCOUNTS' && row.discountType !== 0 && row.discountType !== 1) throw new Error(getLocaleText('UI_INVALID_DISCOUNT_TYPE'));
      if ('quantity' in fields && (row.quantity as number) <= 0) throw new Error(getLocaleText('UI_INVALID_QUANTITY_IN_VALUE', { value0: name }));
    }
  }
  for (const [table, field, target] of references) {
    for (const row of tables[table] as BackupRow[]) {
      if (!ids[target].has(row[field] as string)) throw new Error(getLocaleText('UI_BROKEN_RELATIONSHIP_VALUE_VALUE', { value0: table, value1: field }));
    }
  }
  // Payment records must stay attached to exactly one customer and contain no sale lines.
  for (const payment of tables.TRANSACTIONS as BackupRow[]) {
    if (payment.kind !== 'payment') continue;
    const links = (tables.CUSTOMERS_TRANSACTIONS as BackupRow[]).filter(link => link.transactionId === payment.id);
    const hasLines = ['TRANSACTION_PRODUCTS', 'TRANSACTION_DISCOUNTS'].some(name => (tables[name] as BackupRow[]).some(line => line.transactionId === payment.id));
    if (links.length !== 1 || hasLines) throw new Error(getLocaleText('PAYMENT_INVALID'));
  }
  // Summary rows are derived from canonical links and saved totals, never trusted blindly.
  const sales = new Map((tables.TRANSACTIONS as BackupRow[]).filter(row => !row.deletedAt).map(row => [row.id, Number(row.total)]));
  const summaries = new Map<string, BackupRow>();
  for (const link of tables.CUSTOMERS_TRANSACTIONS as BackupRow[]) {
    if (link.deletedAt || !sales.has(link.transactionId)) continue;
    const id = String(link.customerId);
    const summary = summaries.get(id) || { id, timestamp: 0, count: 0, total: 0 };
    summary.count = Number(summary.count) + 1;
    summary.total = Number(summary.total) + sales.get(link.transactionId)!;
    summary.timestamp = Math.max(Number(summary.timestamp), Number(link.timestamp));
    summaries.set(id, summary);
  }
  const expected = Array.from(summaries.values());
  if (legacy) tables.CUSTOMER_TRANSACTION_SUMMARIES = expected;
  else {
    const actual = tables.CUSTOMER_TRANSACTION_SUMMARIES as BackupRow[];
    if (actual.length !== expected.length || actual.some(row => {
      const match = summaries.get(String(row.id));
      return !match || row.count !== match.count || row.timestamp !== match.timestamp || Math.abs(Number(row.total) - Number(match.total)) > 0.0000001;
    })) throw new Error(getLocaleText('PAGINATION_SUMMARY_INVALID'));
  }
  return value as unknown as DatabaseBackup;
}

/** Persistence boundary for complete, consistent snapshots and atomic replacement. */
export default class DatabaseBackupStore {
  constructor(private readonly database: IDB) {}

  /** One consistent snapshot, emitted as bounded per-table JSON parts. No full database clone. */
  public async exportParts(write: (table: string, part: number, json: string, count: number) => void) {
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    return new Promise<{ databaseVersion: number; sourceDatabase: string; createdAt: string }>((resolve, reject) => {
      const transaction = db.transaction(names, 'readonly');
      let failure: unknown;
      transaction.oncomplete = () => resolve({ databaseVersion: db.version, sourceDatabase: db.name, createdAt: new Date().toISOString() });
      transaction.onabort = () => reject(failure || new Error(getLocaleText('UI_UNABLE_TO_READ_THE_DATABASE_BACKUP')));
      for (const name of names) {
        let rows: string[] = [], bytes = 2, part = 0;
        const encoder = new TextEncoder();
        const flush = () => { write(name, ++part, `[${rows.join(',')}]`, rows.length); rows = []; bytes = 2; };
        const cursor = transaction.objectStore(name).openCursor();
        cursor.onsuccess = () => {
          try {
            const entry = cursor.result;
            if (!entry) { if (rows.length || !part) flush(); return; }
            const json = JSON.stringify(entry.value);
            const size = encoder.encode(json).byteLength + 1;
            if (rows.length && (rows.length >= 1000 || bytes + size > 1024 * 1024)) flush();
            rows.push(json); bytes += size;
            entry.continue();
          } catch (error) { failure = error; transaction.abort(); }
        };
      }
    });
  }

  /** In-memory snapshot for internal consumers; downloadable backups use ZIP parts. */
  public async export(): Promise<DatabaseBackup> {
    const tables: DatabaseBackup['tables'] = {};
    const metadata = await this.exportParts((table, _part, json) => {
      const rows = tables[table] ??= [];
      for (const row of JSON.parse(json) as BackupRow[]) rows.push(row);
    });
    return { format: 'pos-database-backup', formatVersion: 1, ...metadata, tables };
  }

  public async restore(value: unknown): Promise<void> {
    const backup = validateBackup(value);
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    if (db.version !== backup.databaseVersion || names.length !== Object.keys(backup.tables).length || names.some(name => !Object.prototype.hasOwnProperty.call(backup.tables, name))) {
      throw new Error(getLocaleText('UI_BACKUP_SCHEMA_DOES_NOT_MATCH_THIS_DATABASE'));
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(names, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(getLocaleText('UI_RESTORE_FAILED_THE_ORIGINAL_DATABASE_HAS_BEEN_KEPT')));
      try {
        for (const name of names) {
          const store = transaction.objectStore(name);
          store.clear();
          for (const row of backup.tables[name]) store.add(row);
        }
      } catch {
        transaction.abort();
      }
    });
  }
}
