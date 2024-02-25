import ProductItem from "../models/ProductItem";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface IProductOS extends IObjectStore<ProductSchema, ProductItem> {}

// this is what will be stored on database
export interface ProductSchema {
  id: string;
  name: string;
  amount: number;
}

export default class ProductOS
  extends ObjectStore<ProductSchema, ProductItem>
  implements IProductOS
{
  private static OBJECT_STORE_NAME = "PRODUCTS";

  constructor(db: IDB) {
    super(db, ProductOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore, db: IDB) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(item: ProductItem) {
    return {
      id: item.getId(),
      name: item.getName(),
      amount: item.getAmount(),
    } as ProductSchema;
  }

  public getSchemaAsObject(schema: ProductSchema): Promise<ProductItem> {
    return new Promise((resolve, reject) => {
      resolve(new ProductItem(schema));
    });
  }
}
