import { ITransaction } from "../model/Transaction";
import { ITransactionItemViewer as ITransactionItemsViewer } from "../model/TransactionItem";
import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { v4 as uuidv4 } from "uuid";

export interface TransactionItemsSchema {
  id: string;
  transactionId: string;
  itemId: string;
  quantity: number;
}

export interface ITransactionItemsOS
  extends IObjectStore<TransactionItemsSchema, ITransactionItemsViewer> {
  getTransactionItemsAsSchema: (
    transaction: ITransaction
  ) => Promise<TransactionItemsSchema[]>;
}

export default class TransactionItemsOS
  extends ObjectStore<TransactionItemsSchema, ITransactionItemsViewer>
  implements IObjectStoreDB, ITransactionItemsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTION_ITEMS";
  constructor(db: IDB) {
    super(db, TransactionItemsOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
    objectStore.createIndex("itemId", "itemId", { unique: false });
  }

  public getObjectAsSchema(transation: ITransactionItemsViewer) {
    return {
      id: uuidv4(),
      transactionId: transation.getId(),
      itemId: transation.getItem().getId(),
      quantity: transation.getQuantity(),
    } as TransactionItemsSchema;
  }

  public async getTransactionItemsAsSchema(
    transaction: ITransaction
  ): Promise<TransactionItemsSchema[]> {
    return new Promise(async (resolve, reject) => {
      const readOnlyOS = await this.getReadOnlyObjectStore();
      const transactionIDIndex = readOnlyOS.index("transactionId");

      const request = transactionIDIndex.getAll(transaction.getId());

      let transactionItems: TransactionItemsSchema[];

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
