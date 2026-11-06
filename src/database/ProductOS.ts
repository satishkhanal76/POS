import { getLocaleText } from '../contexts/Locale';
import ItemPriceChangesOS from "./ItemPriceChangesOS";
import { v4 as uuidv4 } from "uuid";
import ProductItem from "../models/ProductItem";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface IProductOS extends IObjectStore<ProductSchema, ProductItem> {
  getAtTimestamp: (id: string, timestamp: number) => Promise<ProductItem>;
}

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

  constructor(db: IDB, private readonly priceChanges?: ItemPriceChangesOS) {
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
      amount: item.getOriginalAmount(),
    } as ProductSchema;
  }

  public async getSchemaAsObject(schema: ProductSchema): Promise<ProductItem> {
    const amount = await this.priceChanges?.getPriceAt(schema.id);
    return new ProductItem({ ...schema, amount: amount ?? schema.amount }, schema.amount);
  }

  public async getAtTimestamp(id: string, timestamp: number): Promise<ProductItem> {
    const item = await this.getOne(id);
    const amount = await this.priceChanges?.getPriceAt(id, timestamp);
    return new ProductItem({ id, name: item.getName(), amount: amount ?? item.getOriginalAmount() }, item.getOriginalAmount());
  }

  public async deleteOne(id: string): Promise<ProductItem> {
    const item = await this.getOne(id);
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['PRODUCTS', 'TRANSACTION_PRODUCTS', 'ITEM_PRICE_CHANGES', 'STOCK'], 'readwrite');
      let message = getLocaleText('UI_ITEM_COULD_NOT_BE_DELETED');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const used = transaction.objectStore('TRANSACTION_PRODUCTS').index('productId').count(id);
      used.onsuccess = () => {
        if (used.result) { message = getLocaleText('UI_THIS_ITEM_IS_USED_IN_SAVED_TRANSACTIONS_AND_CANNOT'); transaction.abort(); return; }
        transaction.objectStore('PRODUCTS').delete(id);
        transaction.objectStore('STOCK').delete(id);
        const cursor = transaction.objectStore('ITEM_PRICE_CHANGES').index('itemTimestamp')
          .openCursor(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]));
        cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
      };
    });
    return item;
  }

  /** Keep the original price intact; name edits and new price events commit together. */
  public async updateDetails(id: string, name: string, amount: number): Promise<void> {
    if (!this.priceChanges) throw new Error(getLocaleText('UI_PRICE_HISTORY_IS_UNAVAILABLE'));
    const db = await this.db.getDatabase();
    const historyName = this.priceChanges.getObjectStoreName();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.objectStoreName, historyName], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(getLocaleText('UI_ITEM_COULD_NOT_BE_SAVED')));
      const products = transaction.objectStore(this.objectStoreName);
      const history = transaction.objectStore(historyName);
      const productRequest = products.get(id);
      const latestRequest = history.index('itemTimestamp').openCursor(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]), 'prev');
      latestRequest.onsuccess = () => {
        const original: ProductSchema | undefined = productRequest.result;
        if (!original) { transaction.abort(); return; }
        const latest = latestRequest.result?.value;
        products.put({ ...original, name });
        if ((latest?.amount ?? original.amount) !== amount) {
          history.add({ id: uuidv4(), itemId: id, amount, timestamp: Math.max(Date.now(), (latest?.timestamp ?? 0) + 1) });
        }
      };
    });
  }
}
