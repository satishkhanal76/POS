import { loadSettings } from '../settings/settings';
import { publishStockChange } from '../stock/events';
import { getLocaleText } from "../localization/locale";
import { PageOptions, readIndexPage, requestValue } from "./Pagination";
import { TransactionListEntry } from "../models/TransactionListEntry";
import Transaction, { ITransaction } from "../models/Transaction";
import { IDB } from "./Database";
import ObjectStore, {
  IObjectStore,
  ObjectRequestError,
  ObjectRequestErrorsTypes,
} from "./ObjectStore";
import { ITransactionDiscountsOS } from "./TransactionDiscountsOS";
import { ITransactionProductsOS } from "./TransactionProductsOS";

export interface TransactionsSchema {
  timestamp: number;
  id: string;
  total: number;
  kind?: "sale" | "payment";
}

export interface ITransactionsOS
  extends IObjectStore<TransactionsSchema, Transaction> {
  getListEntries: (ids: string[]) => Promise<TransactionListEntry[]>;
  getAllTransactionsByTimestamp: () => Promise<ITransaction[]>;

  getLatestTransaction: (
    currenltyViewingTransaction?: ITransaction | null
  ) => Promise<Transaction | null>;

  postTransaction: (transaction: Transaction) => Promise<Transaction>;
}

export default class TransactionsOS
  extends ObjectStore<TransactionsSchema, Transaction>
  implements ITransactionsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTIONS";
  private transactionItemsOS: ITransactionProductsOS;
  private transactionDiscountsOS: ITransactionDiscountsOS;
  constructor(
    db: IDB,
    transactionItemsOS: ITransactionProductsOS,
    transactionDiscountsOS: ITransactionDiscountsOS
  ) {
    super(db, TransactionsOS.OBJECT_STORE_NAME);
    this.transactionItemsOS = transactionItemsOS;
    this.transactionDiscountsOS = transactionDiscountsOS;
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("timestamp", "timestamp", { unique: true });
    objectStore.createIndex("id", "id", { unique: true });
  }

  public getObjectAsSchema(object: ITransaction) {
    return {
      timestamp: object.getTimestamp(),
      id: object.getId(),
      total: object.getTotal(),
      kind: object.getKind(),
    };
  }

  public async getSchemaAsObject(
    schema: TransactionsSchema
  ): Promise<Transaction> {
    let transactionProductItems, transactionDiscountItems;
    const transaction = new Transaction(schema.id, schema.timestamp, schema.kind === "payment" ? -schema.total : undefined);
    try {
      transactionProductItems =
        await this.transactionItemsOS.getAllByTransactionId(schema.id, schema.timestamp);
      transactionDiscountItems =
        await this.transactionDiscountsOS.getAllByTransactionId(schema.id);

      transactionProductItems.forEach((item) =>
        transaction.addTransactionProductItem(item)
      );

      transactionDiscountItems.forEach((item) =>
        transaction.addTransactionDiscountItem(item)
      );
    } catch (err) {
      const unknownError = err as ObjectRequestError;
      if (
        unknownError &&
        unknownError.type === ObjectRequestErrorsTypes.EMPTY_RESPONSE
      ) {
        console.log(unknownError.defaultMessage);
      } else {
        console.error(err);
      }
    }
    transaction.setIsPosted(true);
    return transaction;
  }

  public async getPage(options: PageOptions) {
    const db = await this.db.getDatabase();
    const result = await readIndexPage<TransactionsSchema>(db.transaction(this.objectStoreName).objectStore(this.objectStoreName).index('timestamp'), options);
    return { ...result, rows: await this.getListEntries(result.rows.map(row => row.id)) };
  }

  /** Load headers and indexed line counts only for the selected transaction IDs. */
  public async getListEntries(ids: string[]): Promise<TransactionListEntry[]> {
    if (!ids.length) return [];
    const db = await this.db.getDatabase();
    const transaction = db.transaction(['TRANSACTIONS', 'TRANSACTION_PRODUCTS', 'TRANSACTION_DISCOUNTS']);
    const reads = ids.map(id => Promise.all([
      requestValue(transaction.objectStore('TRANSACTIONS').get(id)) as Promise<TransactionsSchema | undefined>,
      requestValue(transaction.objectStore('TRANSACTION_PRODUCTS').index('transactionId').count(id)),
      requestValue(transaction.objectStore('TRANSACTION_DISCOUNTS').index('transactionId').count(id)),
    ]).then(([sale, products, discounts]) => {
      if (!sale) throw new Error(getLocaleText('PAGINATION_TRANSACTION_MISSING'));
      return { ...sale, itemCount: products + discounts };
    }));
    return Promise.all(reads);
  }

  public async getAllTransactionsByTimestamp() {
    return await this.getAllByIndexName("timestamp");
  }

  public async getLatestTransaction(
    currenltyViewingTransaction?: ITransaction | null
  ): Promise<Transaction | null> {
    const os = await this.getReadOnlyObjectStore();
    return new Promise<Transaction | null>((resolve, reject) => {
      const timestampIndex = os.index("timestamp");
      const cursorReq = timestampIndex.openCursor(
        currenltyViewingTransaction
          ? IDBKeyRange.upperBound(
              currenltyViewingTransaction?.getTimestamp(),
              true
            )
          : null,
        "prev"
      );

      cursorReq.onsuccess = (event: Event) => {
        const cursor: IDBCursorWithValue = (event.target as IDBRequest).result;
        if (cursor) {
          resolve(this.getSchemaAsObject(cursor.value));
        } else {
          resolve(null);
        }
      };

      cursorReq.onerror = () => {
        console.log("ERROR");
        reject("Error");
      };
    });
  }

  /** Sale header, line items and stock changes commit together, or all roll back. */
  public async postTransaction(sale: Transaction) {
    if (sale.getKind() === 'payment') throw new Error(getLocaleText('PAYMENT_CUSTOMER_REQUIRED'));
    if (sale.isPosted()) throw new Error(getLocaleText('STOCK_ALREADY_POSTED'));
    const settings = loadSettings();
    const products = sale.getAllTransactionProductItems();
    const discounts = sale.getAllTransactionDiscountItems();
    const quantities = new Map<string, { quantity: number; name: string }>();
    for (const line of products) {
      const id = line.getItem().getId();
      const quantity = (quantities.get(id)?.quantity ?? 0) + line.getQuantity();
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(getLocaleText('QUANTITY_INVALID'));
      quantities.set(id, { quantity, name: line.getItem().getName() });
    }
    const warnings: string[] = [];
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['TRANSACTIONS', 'TRANSACTION_PRODUCTS', 'TRANSACTION_DISCOUNTS', 'PRODUCTS', 'STOCK'], 'readwrite');
      let message = getLocaleText('NOTIFICATION_POST_FAILED');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      try {
        transaction.objectStore('TRANSACTIONS').add(this.getObjectAsSchema(sale));
        for (const line of products) transaction.objectStore('TRANSACTION_PRODUCTS').add(this.transactionItemsOS.getObjectAsSchema(line));
        for (const line of discounts) transaction.objectStore('TRANSACTION_DISCOUNTS').add(this.transactionDiscountsOS.getObjectAsSchema(line));
        for (const [id, item] of quantities) {
          const product = transaction.objectStore('PRODUCTS').get(id);
          product.onsuccess = () => {
            if (!product.result) { message = getLocaleText('UI_UNAVAILABLE_ITEM'); transaction.abort(); return; }
            if (!settings.stockManagement) return;
            const stock = transaction.objectStore('STOCK');
            const count = stock.get(id);
            count.onsuccess = () => {
              const available = count.result?.count ?? 0;
              if (item.quantity > available) {
                const warning = getLocaleText('STOCK_SHORTAGE', { item: item.name, available, requested: item.quantity });
                if (settings.forceStockAdherence) { message = warning; transaction.abort(); return; }
                warnings.push(warning);
              }
              const remaining = available - item.quantity;
              if (!Number.isSafeInteger(remaining)) { message = getLocaleText('STOCK_INVALID'); transaction.abort(); return; }
              stock.put({ id, count: remaining });
            };
          };
        }
      } catch { transaction.abort(); }
    });
    sale.setIsPosted(true);
    if (settings.stockManagement) publishStockChange(warnings);
    return sale;
  }
}
