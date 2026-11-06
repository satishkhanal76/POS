import { ensureListings } from "./listing/maintenance";
import coalesceRead from "./listing/coalesceRead";
import { indexedPriceChange } from "./listing/priceHistory";
import readCatalogPage, {
  indexedCatalog,
  createCatalogIndex,
} from "./listing/catalog";
import { PageOptions } from "./Pagination";
import { getLocaleText } from "../contexts/Locale";
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
  canSell?: number;
  canPurchase?: number;
}

export default class ProductOS
  extends ObjectStore<ProductSchema, ProductItem>
  implements IProductOS
{
  private static OBJECT_STORE_NAME = "PRODUCTS";

  constructor(
    db: IDB,
    private readonly priceChanges?: ItemPriceChangesOS,
  ) {
    super(db, ProductOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    createCatalogIndex(objectStore);
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public onDatabaseUpgrade(
    _database: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    createCatalogIndex(transaction.objectStore("PRODUCTS"));
  }

  public async getCatalogPage(options: PageOptions, search = "") {
    const database = await this.db.getDatabase();
    await ensureListings(database, ["PRODUCTS"]);
    return coalesceRead(database, JSON.stringify(['catalog-models', 'PRODUCTS', options, search]), async () => {
      const result = await readCatalogPage<ProductSchema>(
        database.transaction("PRODUCTS").objectStore("PRODUCTS"),
        options,
        search,
      );
      return {
        ...result,
        rows: await Promise.all(
          result.rows.map((row) => this.getSchemaAsObject(row)),
        ),
      };
    });
  }

  /** Names for pickers come from keys, without loading products or their prices. */
  public async getNameChoices(includeDeleted = false) {
    const database = await this.db.getDatabase();
    await ensureListings(database, ["PRODUCTS"]);
    return new Promise<{ id: string; name: string }[]>((resolve, reject) => {
      const state = includeDeleted ? 1 : 0;
      const request = database
        .transaction("PRODUCTS")
        .objectStore("PRODUCTS")
        .index("catalogKeys")
        .openKeyCursor(IDBKeyRange.bound([state], [state, []]));
      const rows: { id: string; name: string }[] = [];
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(rows);
          return;
        }
        const key = cursor.key as [number, string, string, string, string];
        rows.push({ id: key[3], name: key[4] });
        cursor.continue();
      };
    });
  }

  public getObjectAsSchema(item: ProductItem) {
    return indexedCatalog({
      id: item.getId(),
      ...(item.deletedAt ? { deletedAt: item.deletedAt } : {}),
      name: item.getName(),
      amount: item.getOriginalAmount(),
      canSell: item.canSell,
      canPurchase: item.canPurchase,
    } as ProductSchema);
  }

  public async getSchemaAsObject(schema: ProductSchema): Promise<ProductItem> {
    const amount = await this.priceChanges?.getPriceAt(schema.id);
    return Object.assign(
      new ProductItem(
        { ...schema, amount: amount ?? schema.amount },
        schema.amount,
      ),
      { deletedAt: schema.deletedAt },
    );
  }

  public async getAtTimestamp(
    id: string,
    timestamp: number,
  ): Promise<ProductItem> {
    const item = await this.getOne(id, true);
    const amount = await this.priceChanges?.getPriceAt(id, timestamp);
    return Object.assign(
      new ProductItem(
        {
          id,
          canSell: item.canSell,
          canPurchase: item.canPurchase,
          name: item.getName(),
          amount: amount ?? item.getOriginalAmount(),
        },
        item.getOriginalAmount(),
      ),
      { deletedAt: item.deletedAt },
    );
  }

  /** Keep the original price intact; name edits and new price events commit together. */
  public async updateDetails(
    id: string,
    name: string,
    amount: number,
    eligibility?: { canSell: number; canPurchase: number },
  ): Promise<void> {
    if (!this.priceChanges)
      throw new Error(getLocaleText("UI_PRICE_HISTORY_IS_UNAVAILABLE"));
    const db = await this.db.getDatabase();
    const historyName = this.priceChanges.getObjectStoreName();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [this.objectStoreName, historyName],
        "readwrite",
      );
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(new Error(getLocaleText("UI_ITEM_COULD_NOT_BE_SAVED")));
      const products = transaction.objectStore(this.objectStoreName);
      const history = transaction.objectStore(historyName);
      const productRequest = products.get(id);
      const latestRequest = history
        .index("itemTimestamp")
        .openCursor(
          IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]),
          "prev",
        );
      latestRequest.onsuccess = () => {
        const original: ProductSchema | undefined = productRequest.result;
        if (!original) {
          transaction.abort();
          return;
        }
        const latest = latestRequest.result?.value;
        products.put(indexedCatalog({ ...original, name, ...eligibility }));
        if ((latest?.amount ?? original.amount) !== amount) {
          history.add(
            indexedPriceChange(
              {
                id: uuidv4(),
                itemId: id,
                amount,
                timestamp: Math.max(Date.now(), (latest?.timestamp ?? 0) + 1),
              },
              original.deletedAt,
            ),
          );
        }
      };
    });
  }
}
