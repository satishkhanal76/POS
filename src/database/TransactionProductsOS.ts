import { IDB, IObjectStoreDB } from "./Database";
import { IProductOS } from "./ProductOS";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { v4 as uuidv4 } from "uuid";
import ProductTransactionItem from "../models/ProductTransactionItem";

export interface TransactionProductSchema {
  id: string;
  transactionId: string;
  productId: string;
  quantity: number;
}

export interface ITransactionProductsOS extends IObjectStore<
  TransactionProductSchema,
  ProductTransactionItem
> {
  getAllByTransactionId: (
    transactionId: string,
    timestamp?: number,
  ) => Promise<ProductTransactionItem[]>;
}

export default class TransactionProductsOS
  extends ObjectStore<TransactionProductSchema, ProductTransactionItem>
  implements IObjectStoreDB, ITransactionProductsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTION_PRODUCTS";

  private itemOS: IProductOS;
  constructor(db: IDB, itemOS: IProductOS) {
    super(db, TransactionProductsOS.OBJECT_STORE_NAME);
    this.itemOS = itemOS;
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
    objectStore.createIndex("productId", "productId", { unique: false });
  }

  public getObjectAsSchema(productItem: ProductTransactionItem) {
    return {
      id: uuidv4(),
      transactionId: productItem.getId(),
      productId: productItem.getItem().getId(),
      quantity: productItem.getQuantity(),
    } as TransactionProductSchema;
  }

  public async getAllByTransactionId(
    transactionId: string,
    timestamp?: number,
  ): Promise<ProductTransactionItem[]> {
    if (timestamp === undefined)
      return this.getAllByIndexName("transactionId", transactionId);
    const store = await this.getReadOnlyObjectStore();
    const schemas = await new Promise<TransactionProductSchema[]>(
      (resolve, reject) => {
        const request = store.index("transactionId").getAll(transactionId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    return Promise.all(
      schemas.map(
        async (schema) =>
          new ProductTransactionItem({
            ...schema,
            item: await this.itemOS.getAtTimestamp(schema.productId, timestamp),
          }),
      ),
    );
  }

  public async getSchemaAsObject(schema: TransactionProductSchema) {
    return new ProductTransactionItem({
      ...schema,
      item: await this.itemOS.getOne(schema.productId, true),
    });
  }
}
