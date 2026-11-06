import Transaction from "../models/Transaction";
import { v4 as uuidv4 } from "uuid";
import { ICustomer } from "../models/Customer";
import { getLocaleText } from "../localization/locale";
import { PageOptions, readIndexPage, requestValue } from "./Pagination";
import { CustomerSummarySchema } from "../models/CustomerTransactionSummary";
import CustomerTransaction, {
  ICustomerTransaction,
} from "../models/CustomerTransaction";
import { ICustomerOS } from "./CustomerOS";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { ITransactionsOS } from "./TransactionsOS";

export interface CustomerTransactionsSchema {
  timestamp: number;
  id: string;
  customerId: string;
  transactionId: string;
}

export interface ICustomersTransactionsOS
  extends IObjectStore<CustomerTransactionsSchema, CustomerTransaction> {
  getCustomerTransactions: (
    cutomerId: string
  ) => Promise<CustomerTransaction[]>;
}

export default class CustomersTransactionsOS
  extends ObjectStore<CustomerTransactionsSchema, CustomerTransaction>
  implements
    ICustomersTransactionsOS,
    IObjectStore<CustomerTransactionsSchema, CustomerTransaction>
{
  private static OBJECT_STORE_NAME = "CUSTOMERS_TRANSACTIONS";

  private customerOS: ICustomerOS;
  private transactionsOS: ITransactionsOS;

  constructor(
    db: IDB,
    customerOS: ICustomerOS,
    transactionsOS: ITransactionsOS
  ) {
    super(db, CustomersTransactionsOS.OBJECT_STORE_NAME);
    this.customerOS = customerOS;
    this.transactionsOS = transactionsOS;
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("timestamp", "timestamp", { unique: true });
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("customerId", "customerId", { unique: false });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
  }

  public onDatabaseUpgrade(_db: IDBDatabase, transaction: IDBTransaction) {
    const store = transaction.objectStore(this.objectStoreName);
    if (!store.indexNames.contains('customerTimestamp')) store.createIndex('customerTimestamp', ['customerId', 'timestamp']);
  }

  public async getPage(customerId: string, options: PageOptions) {
    const db = await this.db.getDatabase();
    const index = db.transaction(this.objectStoreName).objectStore(this.objectStoreName).index('customerTimestamp');
    const result = await readIndexPage<CustomerTransactionsSchema>(index, options, IDBKeyRange.bound([customerId, 0], [customerId, Number.MAX_SAFE_INTEGER]));
    return { ...result, rows: await this.transactionsOS.getListEntries(result.rows.map(link => link.transactionId)) };
  }

  public async getLinkedCustomer(transactionId: string) {
    const db = await this.db.getDatabase();
    const store = db.transaction(this.objectStoreName).objectStore(this.objectStoreName);
    const link = await requestValue(store.index('transactionId').get(transactionId)) as CustomerTransactionsSchema | undefined;
    return link ? this.customerOS.getOne(link.customerId) : null;
  }

  /** Payment header, customer link and balance are saved in a single commit. */
  public async recordPayment(payment: Transaction, customer: ICustomer) {
    if (payment.getKind() !== "payment" || !Number.isFinite(payment.getTotal()) || payment.getTotal() >= 0 || !Number.isSafeInteger(Math.round(-payment.getTotal() * 100)) || Math.abs(-payment.getTotal() * 100 - Math.round(-payment.getTotal() * 100)) > 0.000001) throw new Error(getLocaleText("PAYMENT_INVALID"));
    const link = new CustomerTransaction({ id: uuidv4(), timestamp: payment.getTimestamp(), transaction: payment, customer });
    await this.commitLink(link, payment);
    payment.setIsPosted(true);
    return payment;
  }

  /** Enforce one customer per sale and commit its link/summary together, including across tabs. */
  public async addOne(model: CustomerTransaction): Promise<CustomerTransaction> {
    return this.commitLink(model);
  }

  private async commitLink(model: CustomerTransaction, payment?: Transaction): Promise<CustomerTransaction> {
    const db = await this.db.getDatabase();
    const link = this.getObjectAsSchema(model);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.objectStoreName, 'CUSTOMER_TRANSACTION_SUMMARIES', 'TRANSACTIONS', 'CUSTOMER'], 'readwrite');
      let message = getLocaleText('TRANSACTION_LINK_FAILED');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const links = transaction.objectStore(this.objectStoreName);
      const existing = links.index('transactionId').count(link.transactionId);
      existing.onsuccess = () => {
        if (existing.result) { message = getLocaleText('TRANSACTION_ALREADY_LINKED'); transaction.abort(); return; }
        const customer = transaction.objectStore('CUSTOMER').get(link.customerId);
        customer.onsuccess = () => {
          if (!customer.result) { message = getLocaleText('PAGINATION_CUSTOMER_MISSING'); transaction.abort(); return; }
          const sales = transaction.objectStore('TRANSACTIONS');
          if (payment) sales.add({ id: payment.getId(), timestamp: payment.getTimestamp(), total: payment.getTotal(), kind: 'payment' });
          const sale = sales.get(link.transactionId);
          sale.onsuccess = () => {
            if (!sale.result) { message = getLocaleText('PAGINATION_TRANSACTION_MISSING'); transaction.abort(); return; }
            links.add(link);
            const summaries = transaction.objectStore('CUSTOMER_TRANSACTION_SUMMARIES');
            const previous = summaries.get(link.customerId);
            previous.onsuccess = () => {
              const summary: CustomerSummarySchema = previous.result || { id: link.customerId, count: 0, total: 0, timestamp: 0 };
              summaries.put({ id: summary.id, count: summary.count + 1, total: summary.total + sale.result.total, timestamp: Math.max(summary.timestamp, link.timestamp) });
            };
          };
        };
      };
    });
    return model;
  }

  public getObjectAsSchema(object: ICustomerTransaction) {
    return {
      timestamp: object.getTimestamp(),
      id: object.getId(),
      customerId: object.getCustomer().getId(),
      transactionId: object.getTransaction().getId(),
    };
  }

  public async getSchemaAsObject(
    schema: CustomerTransactionsSchema
  ): Promise<CustomerTransaction> {
    const customer = await this.customerOS.getOne(schema.customerId);
    const transaction = await this.transactionsOS.getOne(schema.transactionId);
    const customerTransaction = new CustomerTransaction({
      ...schema,
      customer: customer,
      transaction: transaction,
    });
    return customerTransaction;
  }

  public async getCustomerTransactions(customerId: string) {
    return this.getAllByIndexName("customerId", customerId);
  }

  public async getAllCustomersTransactions() {
    return this.getAllByIndexName("customerId");
  }
}
