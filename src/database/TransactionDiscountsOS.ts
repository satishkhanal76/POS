import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { v4 as uuidv4 } from "uuid";
import DiscountTransactionItem from "../models/DiscountTransactionItem";
import { IDiscountOS } from "./DiscountOS";
export interface TransactionDiscountSchema {
  id: string;
  transactionId: string;
  discountId: string;
  quantity: number;
}

export interface ITransactionDiscountsOS
  extends IObjectStore<TransactionDiscountSchema, DiscountTransactionItem> {
  getAllByTransactionId: (
    transactionId: string
  ) => Promise<DiscountTransactionItem[]>;
}

export default class TransactionDiscountsOS
  extends ObjectStore<TransactionDiscountSchema, DiscountTransactionItem>
  implements IObjectStoreDB, ITransactionDiscountsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTION_DISCOUNTS";

  private discountOS: IDiscountOS;
  constructor(db: IDB, discountOS: IDiscountOS) {
    super(db, TransactionDiscountsOS.OBJECT_STORE_NAME);
    this.discountOS = discountOS;
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
    objectStore.createIndex("discountId", "discountId", { unique: false });
  }

  public getObjectAsSchema(productItem: DiscountTransactionItem) {
    return {
      id: uuidv4(),
      transactionId: productItem.getId(),
      discountId: productItem.getItem().getId(),
      quantity: productItem.getQuantity(),
    } as TransactionDiscountSchema;
  }

  public async getAllByTransactionId(
    transactionId: string
  ): Promise<DiscountTransactionItem[]> {
    return this.getAllByIndexName("transactionId", transactionId);
  }

  public async getSchemaAsObject(schema: TransactionDiscountSchema) {
    return new DiscountTransactionItem({
      ...schema,
      item: await this.discountOS.getOne(schema.discountId),
    });
  }
}
