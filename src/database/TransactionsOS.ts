import { ITransaction, ITransactionViewer } from "../model/Transaction";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface TransactionsSchema {
  timestamp: number;
  id: string;
  total: number;
}

export interface ITransactionsOS
  extends IObjectStore<TransactionsSchema, ITransaction> {
  getLatestTransaction: (
    currenltyViewingTransaction?: ITransactionViewer | null
  ) => Promise<TransactionsSchema | null>;
}

export default class TransactionsOS
  extends ObjectStore<TransactionsSchema, ITransaction>
  implements ITransactionsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTIONS";
  constructor(db: IDB) {
    super(db, TransactionsOS.OBJECT_STORE_NAME);
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

  public async getLatestTransaction(
    currenltyViewingTransaction?: ITransactionViewer | null
  ): Promise<TransactionsSchema | null> {
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
          resolve(cursor.value);
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
}
