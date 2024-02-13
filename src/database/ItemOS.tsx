import { IItem } from "../model/Item";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface IItemOS extends IObjectStore<ItemSchema, IItem> {}

// this is what will be stored on database
export interface ItemSchema {
  id: string;
  name: string;
  price: number;
}

export default class ItemOS
  extends ObjectStore<ItemSchema, IItem>
  implements IItemOS
{
  private static OBJECT_STORE_NAME = "ITEMS";

  constructor(db: IDB) {
    super(db, ItemOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore, db: IDB) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(item: IItem) {
    return {
      id: item.getId(),
      name: item.getName(),
      price: item.getPrice(),
    } as ItemSchema;
  }
}
