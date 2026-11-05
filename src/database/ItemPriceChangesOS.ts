import ObjectStore from './ObjectStore';
import { IDB } from './Database';
import ItemPriceChange, { ItemPriceChangeSchema } from '../models/ItemPriceChange';

export default class ItemPriceChangesOS extends ObjectStore<ItemPriceChangeSchema, ItemPriceChange> {
  constructor(db: IDB) { super(db, 'ITEM_PRICE_CHANGES'); }
  public onObjectStoreCreation(store: IDBObjectStore) {
    store.createIndex('id', 'id', { unique: true });
    store.createIndex('itemTimestamp', ['itemId', 'timestamp'], { unique: true });
  }
  public getObjectAsSchema(change: ItemPriceChange) { return change.data; }
  public async getSchemaAsObject(schema: ItemPriceChangeSchema) { return new ItemPriceChange(schema); }
  public async getPriceAt(itemId: string, timestamp = Number.MAX_SAFE_INTEGER): Promise<number | undefined> {
    const db = await this.db.getDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.getObjectStoreName()).objectStore(this.getObjectStoreName())
        .index('itemTimestamp').openCursor(IDBKeyRange.bound([itemId, 0], [itemId, timestamp]), 'prev');
      request.onsuccess = () => resolve(request.result?.value.amount);
      request.onerror = () => reject(request.error);
    });
  }
}
