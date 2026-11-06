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
  deletedAt?: number;
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

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(item: ProductItem) {
    return {
      id: item.getId(),
      ...(item.deletedAt ? { deletedAt: item.deletedAt } : {}),
      name: item.getName(),
      amount: item.getOriginalAmount(),
    } as ProductSchema;
  }

  public async getSchemaAsObject(schema: ProductSchema): Promise<ProductItem> {
    const amount = await this.priceChanges?.getPriceAt(schema.id);
    return Object.assign(new ProductItem({ ...schema, amount: amount ?? schema.amount }, schema.amount), { deletedAt: schema.deletedAt });
  }

  public async getAtTimestamp(id: string, timestamp: number): Promise<ProductItem> {
    const item = await this.getOne(id, true);
    const amount = await this.priceChanges?.getPriceAt(id, timestamp);
    return Object.assign(new ProductItem({ id, name: item.getName(), amount: amount ?? item.getOriginalAmount() }, item.getOriginalAmount()), { deletedAt: item.deletedAt });
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
