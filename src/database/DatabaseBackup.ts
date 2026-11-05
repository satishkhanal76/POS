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
  PRODUCTS: { id: 'string', name: 'string', amount: 'number' },
  CUSTOMER: { id: 'string', name: 'string', phoneNumber: 'string' },
  DISCOUNTS: { id: 'string', name: 'string', amount: 'number', discountType: 'number' },
  TRANSACTIONS: { id: 'string', timestamp: 'number', total: 'number' },
  TRANSACTION_PRODUCTS: { id: 'string', transactionId: 'string', productId: 'string', quantity: 'number' },
  TRANSACTION_DISCOUNTS: { id: 'string', transactionId: 'string', discountId: 'string', quantity: 'number' },
  CUSTOMERS_TRANSACTIONS: { id: 'string', timestamp: 'number', customerId: 'string', transactionId: 'string' },
};
const references = [
  ['TRANSACTION_PRODUCTS', 'transactionId', 'TRANSACTIONS'],
  ['TRANSACTION_PRODUCTS', 'productId', 'PRODUCTS'],
  ['TRANSACTION_DISCOUNTS', 'transactionId', 'TRANSACTIONS'],
  ['TRANSACTION_DISCOUNTS', 'discountId', 'DISCOUNTS'],
  ['CUSTOMERS_TRANSACTIONS', 'customerId', 'CUSTOMER'],
  ['CUSTOMERS_TRANSACTIONS', 'transactionId', 'TRANSACTIONS'],
];
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function validateBackup(value: unknown): DatabaseBackup {
  if (!isObject(value) || value.format !== 'pos-database-backup' || value.formatVersion !== 1 || value.databaseVersion !== 1
    || typeof value.sourceDatabase !== 'string' || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !isObject(value.tables)) {
    throw new Error('This is not a supported POS database backup.');
  }
  const tables = value.tables;
  if (Object.keys(tables).length !== Object.keys(tableFields).length) throw new Error('Backup must contain every database table.');
  const ids: Record<string, Set<string>> = {};
  for (const [name, fields] of Object.entries(tableFields)) {
    const rows = tables[name];
    if (!Array.isArray(rows)) throw new Error(`Missing table: ${name}.`);
    ids[name] = new Set();
    const timestamps = new Set<number>();
    for (const row of rows) {
      if (!isObject(row)) throw new Error(`Invalid record in ${name}.`);
      for (const [field, type] of Object.entries(fields)) {
        if (typeof row[field] !== type || (type === 'number' && !Number.isFinite(row[field]))) throw new Error(`Invalid ${name}.${field}.`);
      }
      const id = row.id as string;
      if (!id || ids[name].has(id)) throw new Error(`Missing or duplicate ID in ${name}.`);
      ids[name].add(id);
      if ('timestamp' in fields) {
        const timestamp = row.timestamp as number;
        if (timestamps.has(timestamp)) throw new Error(`Duplicate timestamp in ${name}.`);
        timestamps.add(timestamp);
      }
      if (name === 'DISCOUNTS' && row.discountType !== 0 && row.discountType !== 1) throw new Error('Invalid discount type.');
      if ('quantity' in fields && (row.quantity as number) <= 0) throw new Error(`Invalid quantity in ${name}.`);
    }
  }
  for (const [table, field, target] of references) {
    for (const row of tables[table] as BackupRow[]) {
      if (!ids[target].has(row[field] as string)) throw new Error(`Broken relationship: ${table}.${field}.`);
    }
  }
  return value as unknown as DatabaseBackup;
}

/** Persistence boundary for complete, consistent snapshots and atomic replacement. */
export default class DatabaseBackupStore {
  constructor(private readonly database: IDB) {}

  public async export(): Promise<DatabaseBackup> {
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(names, 'readonly');
      const tables: Record<string, BackupRow[]> = {};
      for (const name of names) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => { tables[name] = request.result; };
      }
      transaction.oncomplete = () => resolve({ format: 'pos-database-backup', formatVersion: 1, databaseVersion: db.version, sourceDatabase: db.name, createdAt: new Date().toISOString(), tables });
      transaction.onabort = () => reject(new Error('Unable to read the database backup.'));
    });
  }

  public async restore(value: unknown): Promise<void> {
    const backup = validateBackup(value);
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    if (db.version !== backup.databaseVersion || names.length !== Object.keys(backup.tables).length || names.some(name => !Object.prototype.hasOwnProperty.call(backup.tables, name))) {
      throw new Error('Backup schema does not match this database.');
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(names, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error('Restore failed. The original database has been kept.'));
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
