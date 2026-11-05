import { IDB } from './Database';
import ObjectStore from './ObjectStore';
import { ICustomerOS } from './CustomerOS';
import CustomerTransactionSummary, { CustomerSummarySchema } from '../models/CustomerTransactionSummary';
import { CustomerTransactionsSchema } from './CustomersTransactionsOS';
import { TransactionsSchema } from './TransactionsOS';
import { PageOptions, readIndexPage } from './Pagination';

export default class CustomerTransactionSummariesOS extends ObjectStore<CustomerSummarySchema, CustomerTransactionSummary> {
  constructor(db: IDB, private readonly customers: ICustomerOS) { super(db, 'CUSTOMER_TRANSACTION_SUMMARIES'); }
  public onObjectStoreCreation(store: IDBObjectStore) {
    store.createIndex('id', 'id', { unique: true });
    store.createIndex('timestamp', 'timestamp');
  }
  public getObjectAsSchema(summary: CustomerTransactionSummary) { return summary.data; }
  public async getSchemaAsObject(schema: CustomerSummarySchema) {
    return new CustomerTransactionSummary(schema, await this.customers.getOne(schema.id));
  }
  public async getPage(options: PageOptions) {
    const db = await this.db.getDatabase();
    const result = await readIndexPage<CustomerSummarySchema>(db.transaction(this.objectStoreName).objectStore(this.objectStoreName).index('timestamp'), options);
    return { ...result, rows: await Promise.all(result.rows.map(row => this.getSchemaAsObject(row))) };
  }

  /** One-time v3 migration aggregates existing links without rebuilding sale models. */
  public onDatabaseUpgrade(_db: IDBDatabase, transaction: IDBTransaction, oldVersion: number) {
    if (oldVersion >= 3) return;
    const summaries = new Map<string, CustomerSummarySchema>();
    const cursor = transaction.objectStore('CUSTOMERS_TRANSACTIONS').openCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) {
        for (const summary of summaries.values()) transaction.objectStore(this.objectStoreName).put(summary);
        return;
      }
      const link = entry.value as CustomerTransactionsSchema;
      const sale = transaction.objectStore('TRANSACTIONS').get(link.transactionId);
      sale.onsuccess = () => {
        const record = sale.result as TransactionsSchema | undefined;
        if (record) {
          const summary = summaries.get(link.customerId) || { id: link.customerId, count: 0, total: 0, timestamp: 0 };
          summary.count++;
          summary.total += record.total;
          summary.timestamp = Math.max(summary.timestamp, link.timestamp);
          summaries.set(link.customerId, summary);
        }
        entry.continue();
      };
    };
  }
}
