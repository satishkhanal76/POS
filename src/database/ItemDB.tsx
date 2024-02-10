import { IItem } from "../model/Item";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface IItemDB extends IObjectStore<ItemSchema> {
  /**
   * Adds an item to the database
   * @param item the item to be added
   * @returns void
   */
  addItem: (item: IItem) => void;
}

// this is what will be stored on database
export interface ItemSchema {
  id: string;
  name: string;
  price: number;
}

export default class ItemDB extends ObjectStore<ItemSchema> implements IItemDB {
  static OBJECT_STORE_NAME = "ITEMS";

  constructor(db: IDB) {
    super(db, ItemDB.OBJECT_STORE_NAME);

    this.addObjectStore();
  }

  private addObjectStore() {
    this.db.addObjectStore(
      ItemDB.OBJECT_STORE_NAME,
      {
        keyPath: "id",
      },
      (objectStore: IDBObjectStore) => {
        objectStore.createIndex("id", "id", { unique: true });
        objectStore.createIndex("name", "name", { unique: false });
      }
    );
  }

  private convertItemToSchema(item: IItem) {
    return {
      id: item.getId(),
      name: item.getName(),
      price: item.getPrice(),
    } as ItemSchema;
  }

  public async addItem(item: IItem) {
    const objectStore = await this.getReadWriteObjectStore();
    objectStore?.add(this.convertItemToSchema(item));
  }
}
