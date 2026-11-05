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
    };
  }

  public async getSchemaAsObject(
    schema: TransactionsSchema
  ): Promise<Transaction> {
    let transactionProductItems, transactionDiscountItems;
    const transaction = new Transaction(schema.id, schema.timestamp);
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
    return new Promise(async (resolve, reject) => {
      const os = await this.getReadOnlyObjectStore();
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

  public async postTransaction(transaction: Transaction) {
    const transactionProductItems = transaction.getAllTransactionProductItems();
    const transactionDiscountItems =
      transaction.getAllTransactionDiscountItems();
    await Promise.all([this.transactionItemsOS.addMany(transactionProductItems), this.transactionDiscountsOS.addMany(transactionDiscountItems)]);

    return await this.addOne(transaction);
  }
}
