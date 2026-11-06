import { ensureListings } from "./listing/maintenance";
import {
  createListingIndexes,
  indexedSummary,
} from "./listing/metadata";
import readListingPage from "./listing/readPage";
import CustomerActivityStore from "./CustomerActivityStore";
import Customer from "../models/Customer";
import { IDB } from "./Database";
import ObjectStore from "./ObjectStore";
import { ICustomerOS } from "./CustomerOS";
import CustomerTransactionSummary, {
  CustomerSummarySchema,
} from "../models/CustomerTransactionSummary";
import { CustomerTransactionsSchema } from "./CustomersTransactionsOS";
import { TransactionsSchema } from "./TransactionsOS";
import { PageOptions } from "./Pagination";

export default class CustomerTransactionSummariesOS extends ObjectStore<
  CustomerSummarySchema,
  CustomerTransactionSummary
> {
  constructor(
    db: IDB,
    private readonly customers: ICustomerOS,
  ) {
    super(db, "CUSTOMER_TRANSACTION_SUMMARIES");
  }
  public onObjectStoreCreation(store: IDBObjectStore) {
    createListingIndexes(store);
    store.createIndex("id", "id", { unique: true });
    store.createIndex("timestamp", "timestamp");
  }
  public getObjectAsSchema(summary: CustomerTransactionSummary) {
    return indexedSummary(summary.data, summary.customer.deletedAt);
  }
  public async getSchemaAsObject(schema: CustomerSummarySchema) {
    return new CustomerTransactionSummary(
      schema,
      await this.customers.getOne(schema.id, true),
    );
  }
  public async getPage(options: PageOptions) {
    if (!options.includeDeleted) {
      const database = await this.db.getDatabase();
      await ensureListings(database, ["CUSTOMER_TRANSACTION_SUMMARIES"]);
      const result = await readListingPage<CustomerSummarySchema>(
        [
          database
            .transaction(this.objectStoreName)
            .objectStore(this.objectStoreName),
        ],
        options,
        { start: 0, end: Number.MAX_SAFE_INTEGER, all: true },
      );
      return {
        ...result,
        rows: await Promise.all(
          result.rows.map((row) => this.getSchemaAsObject(row)),
        ),
      };
    }
    const rows = (
      await new CustomerActivityStore(this.db).list(options.includeDeleted)
    )
      .filter((row) => row.count > 0)
      .sort((a, b) =>
        options.sort === "oldest"
          ? a.timestamp - b.timestamp
          : b.timestamp - a.timestamp,
      );
    const pageSize = [0, 10, 25, 50, 100].includes(options.pageSize)
      ? options.pageSize
      : 10;
    const size = pageSize || Math.max(1, rows.length);
    const page = Math.min(
      Math.max(1, options.page),
      Math.max(1, Math.ceil(rows.length / size)),
    );
    return {
      total: rows.length,
      pageSize,
      page,
      rows: rows
        .slice((page - 1) * size, page * size)
        .map(
          (row) =>
            new CustomerTransactionSummary(
              {
                id: row.id,
                total: row.total,
                count: row.count,
                timestamp: row.timestamp,
              },
              Object.assign(new Customer(row), { deletedAt: row.deletedAt }),
            ),
        ),
    };
  }

  /** One-time v3 migration aggregates existing links without rebuilding sale models. */
  public onDatabaseUpgrade(
    _db: IDBDatabase,
    transaction: IDBTransaction,
    oldVersion: number,
  ) {
    const store = transaction.objectStore(this.objectStoreName);
    createListingIndexes(store);
    if (oldVersion >= 3) return;
    const summaries = new Map<string, CustomerSummarySchema>();
    const cursor = transaction
      .objectStore("CUSTOMERS_TRANSACTIONS")
      .openCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) {
        for (const summary of summaries.values())
          transaction
            .objectStore(this.objectStoreName)
            .put(indexedSummary(summary));
        return;
      }
      const link = entry.value as CustomerTransactionsSchema;
      const sale = transaction
        .objectStore("TRANSACTIONS")
        .get(link.transactionId);
      sale.onsuccess = () => {
        const record = sale.result as TransactionsSchema | undefined;
        if (record) {
          const summary = summaries.get(link.customerId) || {
            id: link.customerId,
            count: 0,
            total: 0,
            timestamp: 0,
          };
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
