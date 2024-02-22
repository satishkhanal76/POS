import { Item } from "../model/Item";
import { ITransaction } from "../model/Transaction";
import TransactionItem, {
  ITransactionItemViewer as ITransactionItemsViewer,
} from "../model/TransactionItem";
import { IDB, IObjectStoreDB } from "./Database";
import { IItemOS } from "./ItemOS";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { v4 as uuidv4 } from "uuid";

export interface TransactionItemsSchema {
  id: string;
  transactionId: string;
  itemId: string;
  quantity: number;
}

export interface ITransactionItemsOS
  extends IObjectStore<TransactionItemsSchema, TransactionItem> {
  getAllByTransactionId: (transactionId: string) => Promise<TransactionItem[]>;
}

export default class TransactionItemsOS
  extends ObjectStore<TransactionItemsSchema, TransactionItem>
  implements IObjectStoreDB, ITransactionItemsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTION_ITEMS";

  private itemOS: IItemOS;
  constructor(db: IDB, itemOS: IItemOS) {
    super(db, TransactionItemsOS.OBJECT_STORE_NAME);
    this.itemOS = itemOS;
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

  public async getAllByTransactionId(
    transactionId: string
  ): Promise<TransactionItem[]> {
    return this.getAllByIndexName("transactionId", transactionId);
  }

  public async getSchemaAsObject(schema: TransactionItemsSchema) {
    return new TransactionItem({
      ...schema,
      item: await this.itemOS.getOne(schema.itemId),
    });
  }

  // public async getTransactionItemsAsSchema(
  //   transaction: ITransaction
  // ): Promise<TransactionItemsSchema[]> {
  //   return this.getObjectAsSchema(transaction);
  // }
}
