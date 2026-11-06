import { IDB } from './Database';
import ObjectStore from './ObjectStore';
import { StockSchema } from '../models/Stock';
import { requestValue } from './Pagination';
import { getLocaleText } from '../localization/locale';
import { publishStockChange } from '../stock/events';

export default class StockOS extends ObjectStore<StockSchema, StockSchema> {
  constructor(database: IDB) { super(database, 'STOCK'); }
  onObjectStoreCreation(store: IDBObjectStore) { store.createIndex('id', 'id', { unique: true }); }
  getObjectAsSchema(stock: StockSchema) { return stock; }
  async getSchemaAsObject(stock: StockSchema) { return stock; }
  async getCounts(ids: string[]) {
    if (!ids.length) return {} as Record<string, number>;
    const db = await this.db.getDatabase();
    const store = db.transaction('STOCK').objectStore('STOCK');
    const values = await Promise.all(ids.map(async id => [id, ((await requestValue(store.get(id))) as StockSchema | undefined)?.count ?? 0] as const));
    return Object.fromEntries(values);
  }
  async setCount(id: string, count: number) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(getLocaleText('STOCK_INVALID'));
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['STOCK', 'PRODUCTS'], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(getLocaleText('STOCK_SAVE_FAILED')));
      const product = transaction.objectStore('PRODUCTS').get(id);
      product.onsuccess = () => {
        if (!product.result) { transaction.abort(); return; }
        transaction.objectStore('STOCK').put({ id, count });
      };
    });
    publishStockChange();
  }
}
