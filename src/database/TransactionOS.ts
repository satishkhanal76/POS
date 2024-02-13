import { ITransaction } from "../model/Transaction";
import { ITransactionItemViewer } from "../model/TransactionItem";
import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { v4 as uuidv4 } from "uuid";

export interface TransactionSchema {
  id: string;
  transactionId: string;
  itemId: string;
  quantity: number;
}

export interface ITransactionOS
  extends IObjectStore<TransactionSchema, ITransactionItemViewer> {
  getTransactionItemsAsSchema: (
    transaction: ITransaction
  ) => Promise<TransactionSchema[]>;
}

export default class TransactionOS
  extends ObjectStore<TransactionSchema, ITransactionItemViewer>
  implements IObjectStoreDB, ITransactionOS
{
  private static OBJECT_STORE_NAME = "TRANSACTION";
  constructor(db: IDB) {
    super(db, TransactionOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
    objectStore.createIndex("itemId", "itemId", { unique: false });
  }

  public getObjectAsSchema(transation: ITransactionItemViewer) {
    return {
      id: uuidv4(),
      transactionId: transation.getId(),
      itemId: transation.getItem().getId(),
      quantity: transation.getQuantity(),
    } as TransactionSchema;
  }

  public async getTransactionItemsAsSchema(
    transaction: ITransaction
  ): Promise<TransactionSchema[]> {
    return new Promise(async (resolve, reject) => {
      const readOnlyOS = await this.getReadOnlyObjectStore();
      const transactionIDIndex = readOnlyOS.index("transactionId");

      const request = transactionIDIndex.getAll(transaction.getId());

      let transactionItems: TransactionSchema[];

      request.onsuccess = () => {
        transactionItems = request.result;
      };

      readOnlyOS.transaction.oncomplete = () => {
        resolve(transactionItems);
      };
    });

    return [];
  }
}
