import Transaction, {
  ITransaction,
  ITransactionViewer,
} from "../model/Transaction";
import TransactionItem from "../model/TransactionItem";
import { IDB } from "./Database";
import ObjectStore, {
  IObjectStore,
  ObjectRequestError,
  ObjectRequestErrorsTypes,
} from "./ObjectStore";
import { ITransactionItemsOS } from "./TransactionItemsOS";

export interface TransactionsSchema {
  timestamp: number;
  id: string;
  total: number;
}

export interface ITransactionsOS
  extends IObjectStore<TransactionsSchema, Transaction> {
  getLatestTransaction: (
    currenltyViewingTransaction?: ITransactionViewer | null
  ) => Promise<Transaction | null>;

  postTransaction: (transaction: Transaction) => Promise<Transaction>;
}

export default class TransactionsOS
  extends ObjectStore<TransactionsSchema, Transaction>
  implements ITransactionsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTIONS";
  private transactionItemsOS: ITransactionItemsOS;
  constructor(db: IDB, transactionItemsOS: ITransactionItemsOS) {
    super(db, TransactionsOS.OBJECT_STORE_NAME);
    this.transactionItemsOS = transactionItemsOS;
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
    let transactionItems;
    const transaction = new Transaction(schema.id, schema.timestamp);
    try {
      transactionItems = await this.transactionItemsOS.getAllByTransactionId(
        schema.id
      );
      transaction.addTransactionItems(transactionItems);
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

  public async getLatestTransaction(
    currenltyViewingTransaction?: ITransactionViewer | null
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
    const transactionItems = transaction.getAllTransactionItems();
    await this.transactionItemsOS.addMany(transactionItems);
    return await this.addOne(transaction);
  }
}
