import {
  indexedHeader,
  indexedSummary,
  indexedLink,
} from "./listing/metadata";
import { DELETION_UPDATED } from "../deletion/state";
import TransactionHistoryStore from "./TransactionHistoryStore";
import Transaction from "../models/Transaction";
import { v4 as uuidv4 } from "uuid";
import { ICustomer } from "../models/Customer";
import { getLocaleText } from "../localization/locale";
import { PageOptions, requestValue } from "./Pagination";
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
  deletedAt?: number;
}

export interface ICustomersTransactionsOS extends IObjectStore<
  CustomerTransactionsSchema,
  CustomerTransaction
> {
  getCustomerTransactions: (
    cutomerId: string,
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
    transactionsOS: ITransactionsOS,
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

  public onDatabaseUpgrade(
    _db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const store = transaction.objectStore(this.objectStoreName);
    if (!store.indexNames.contains("customerTimestamp"))
      store.createIndex("customerTimestamp", ["customerId", "timestamp"]);
    if (!store.indexNames.contains("activeLink"))
      store.createIndex("activeLink", "activeLink");
  }

  public async getPage(customerId: string, options: PageOptions) {
    const result = await new TransactionHistoryStore(this.db).getPage(
      options,
      { start: 0, end: Number.MAX_SAFE_INTEGER, all: true },
      undefined,
      customerId,
    );
    return {
      ...result,
      rows: await this.transactionsOS.getListEntries(
        result.rows.map((row) => row.id),
        result.rows,
      ),
    };
  }

  public async getLinkedCustomer(transactionId: string) {
    const db = await this.db.getDatabase();
    const store = db
      .transaction(this.objectStoreName)
      .objectStore(this.objectStoreName);
    const links = (await requestValue(
      store.index("transactionId").getAll(transactionId),
    )) as CustomerTransactionsSchema[];
    const link = links.find((row) => !row.deletedAt);
    return link ? this.customerOS.getOne(link.customerId, true) : null;
  }

  /** Archive the current assignment and rebuild its customer's active summary together. */
  public async unlinkTransaction(
    transactionId: string,
    expectedCustomerId: string,
  ): Promise<void> {
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [
          this.objectStoreName,
          "TRANSACTIONS",
          "CUSTOMER_TRANSACTION_SUMMARIES",
          "CUSTOMER",
        ],
        "readwrite",
      );
      let message = getLocaleText("UNLINK_FAILED");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const links = transaction.objectStore(this.objectStoreName);
      const current = links.index("transactionId").getAll(transactionId);
      current.onsuccess = () => {
        const active = (current.result as CustomerTransactionsSchema[]).filter(
          (link) => !link.deletedAt,
        );
        if (
          !active.length ||
          active.some((link) => link.customerId !== expectedCustomerId)
        ) {
          message = getLocaleText("UNLINK_CHANGED");
          transaction.abort();
          return;
        }
        const sale = transaction.objectStore("TRANSACTIONS").get(transactionId);
        sale.onsuccess = () => {
          if (!sale.result) {
            message = getLocaleText("PAGINATION_TRANSACTION_MISSING");
            transaction.abort();
            return;
          }
          transaction
            .objectStore("TRANSACTIONS")
            .put(indexedHeader(sale.result, sale.result.kind ?? "sale", []));
          const deletedAt = Date.now();
          for (const link of active)
            links.put(indexedLink({ ...link, deletedAt }));
          const remaining = links
            .index("customerId")
            .getAll(expectedCustomerId);
          remaining.onsuccess = () => {
            const summary: CustomerSummarySchema = {
              id: expectedCustomerId,
              count: 0,
              total: 0,
              timestamp: 0,
            };
            const summaries = transaction.objectStore(
              "CUSTOMER_TRANSACTION_SUMMARIES",
            );
            const candidates = (
              remaining.result as CustomerTransactionsSchema[]
            ).filter((link) => !link.deletedAt);
            let pending = candidates.length;
            const save = () => {
              const contact = transaction
                .objectStore("CUSTOMER")
                .get(expectedCustomerId);
              contact.onsuccess = () => {
                if (summary.count)
                  summaries.put(
                    indexedSummary(summary, contact.result?.deletedAt),
                  );
                else summaries.delete(expectedCustomerId);
              };
            };
            if (!pending) {
              save();
              return;
            }
            for (const link of candidates) {
              const header = transaction
                .objectStore("TRANSACTIONS")
                .get(link.transactionId);
              header.onsuccess = () => {
                if (header.result && !header.result.deletedAt) {
                  summary.count++;
                  summary.total += header.result.total;
                  summary.timestamp = Math.max(
                    summary.timestamp,
                    link.timestamp,
                  );
                }
                if (!--pending) save();
              };
            }
          };
        };
      };
    });
    window.dispatchEvent(new Event(DELETION_UPDATED));
  }

  /** Payment header, customer link and balance are saved in a single commit. */
  public async recordPayment(payment: Transaction, customer: ICustomer) {
    if (
      payment.getKind() !== "payment" ||
      !Number.isFinite(payment.getTotal()) ||
      payment.getTotal() >= 0 ||
      !Number.isSafeInteger(Math.round(-payment.getTotal() * 100)) ||
      Math.abs(
        -payment.getTotal() * 100 - Math.round(-payment.getTotal() * 100),
      ) > 0.000001
    )
      throw new Error(getLocaleText("PAYMENT_INVALID"));
    const link = new CustomerTransaction({
      id: uuidv4(),
      timestamp: payment.getTimestamp(),
      transaction: payment,
      customer,
    });
    await this.commitLink(link, payment);
    payment.setIsPosted(true);
    return payment;
  }

  /** Enforce one customer per sale and commit its link/summary together, including across tabs. */
  public async addOne(
    model: CustomerTransaction,
  ): Promise<CustomerTransaction> {
    return this.commitLink(model);
  }

  private async commitLink(
    model: CustomerTransaction,
    payment?: Transaction,
  ): Promise<CustomerTransaction> {
    const db = await this.db.getDatabase();
    const link = this.getObjectAsSchema(model);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [
          this.objectStoreName,
          "CUSTOMER_TRANSACTION_SUMMARIES",
          "TRANSACTIONS",
          "CUSTOMER",
        ],
        "readwrite",
      );
      let message = getLocaleText("TRANSACTION_LINK_FAILED");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const links = transaction.objectStore(this.objectStoreName);
      const existing = links.index("transactionId").getAll(link.transactionId);
      existing.onsuccess = () => {
        if (
          (existing.result as CustomerTransactionsSchema[]).some(
            (row) => !row.deletedAt,
          )
        ) {
          message = getLocaleText("TRANSACTION_ALREADY_LINKED");
          transaction.abort();
          return;
        }
        const customer = transaction
          .objectStore("CUSTOMER")
          .get(link.customerId);
        customer.onsuccess = () => {
          if (!customer.result || customer.result.deletedAt) {
            message = getLocaleText("PAGINATION_CUSTOMER_MISSING");
            transaction.abort();
            return;
          }
          const sales = transaction.objectStore("TRANSACTIONS");
          if (payment)
            sales.add(
              indexedHeader(
                {
                  id: payment.getId(),
                  timestamp: payment.getTimestamp(),
                  total: payment.getTotal(),
                  kind: "payment",
                },
                "payment",
                [link.customerId],
              ),
            );
          const sale = sales.get(link.transactionId);
          sale.onsuccess = () => {
            if (!sale.result || sale.result.deletedAt) {
              message = getLocaleText("PAGINATION_TRANSACTION_MISSING");
              transaction.abort();
              return;
            }
            sales.put(
              indexedHeader(sale.result, sale.result.kind ?? "sale", [
                link.customerId,
              ]),
            );
            links.add(link);
            const summaries = transaction.objectStore(
              "CUSTOMER_TRANSACTION_SUMMARIES",
            );
            const previous = summaries.get(link.customerId);
            previous.onsuccess = () => {
              const summary: CustomerSummarySchema = previous.result || {
                id: link.customerId,
                count: 0,
                total: 0,
                timestamp: 0,
              };
              summaries.put(
                indexedSummary(
                  {
                    id: summary.id,
                    count: summary.count + 1,
                    total: summary.total + sale.result.total,
                    timestamp: Math.max(summary.timestamp, link.timestamp),
                  },
                  customer.result.deletedAt,
                ),
              );
            };
          };
        };
      };
    });
    return model;
  }

  public getObjectAsSchema(object: ICustomerTransaction) {
    return indexedLink({
      timestamp: object.getTimestamp(),
      id: object.getId(),
      customerId: object.getCustomer().getId(),
      transactionId: object.getTransaction().getId(),
    });
  }

  public async getSchemaAsObject(
    schema: CustomerTransactionsSchema,
  ): Promise<CustomerTransaction> {
    const customer = await this.customerOS.getOne(schema.customerId, true);
    const transaction = await this.transactionsOS.getOne(
      schema.transactionId,
      true,
    );
    const customerTransaction = new CustomerTransaction({
      ...schema,
      customer: customer,
      transaction: transaction,
    });
    return customerTransaction;
  }

  public async getCustomerTransactions(customerId: string) {
    return (await this.getAllByIndexName("customerId", customerId)).filter(
      (link) => !link.getTransaction().deletedAt,
    );
  }

  public async getAllCustomersTransactions() {
    return (await this.getAllByIndexName("customerId")).filter(
      (link) =>
        !link.getTransaction().deletedAt && !link.getCustomer().deletedAt,
    );
  }
}
