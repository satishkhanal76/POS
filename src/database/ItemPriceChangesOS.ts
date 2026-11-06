import { ensureListings } from "./listing/maintenance";
import coalesceRead from "./listing/coalesceRead";
import { getLocaleText } from "../contexts/Locale";
import { PageOptions } from "./Pagination";
import readListingPage from "./listing/readPage";
import { indexedPriceChange } from "./listing/priceHistory";
import { contactScope } from "./listing/metadata";
import type { PriceHistoryEntry } from "../controllers/PriceHistoryController";
import ObjectStore from "./ObjectStore";
import { IDB } from "./Database";
import ItemPriceChange, {
  ItemPriceChangeSchema,
} from "../models/ItemPriceChange";

export default class ItemPriceChangesOS extends ObjectStore<
  ItemPriceChangeSchema,
  ItemPriceChange
> {
  constructor(db: IDB) {
    super(db, "ITEM_PRICE_CHANGES");
  }
  public onObjectStoreCreation(store: IDBObjectStore) {
    store.createIndex("listDate", "listDate", { multiEntry: true });
    store.createIndex("id", "id", { unique: true });
    store.createIndex("itemTimestamp", ["itemId", "timestamp"], {
      unique: true,
    });
  }
  public getObjectAsSchema(change: ItemPriceChange) {
    return indexedPriceChange(change.data);
  }
  public async getSchemaAsObject(schema: ItemPriceChangeSchema) {
    return new ItemPriceChange(schema);
  }
  public onDatabaseUpgrade(
    _database: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const store = transaction.objectStore(this.objectStoreName);
    if (!store.indexNames.contains("listDate"))
      store.createIndex("listDate", "listDate", { multiEntry: true });
  }

  public async getHistoryPage(options: PageOptions, itemId?: string) {
    const db = await this.db.getDatabase();
    await ensureListings(db, ["ITEM_PRICE_CHANGES"]);
    return coalesceRead(
      db,
      JSON.stringify(["price-history", options, itemId]),
      () => this.readHistoryPage(db, options, itemId),
    );
  }
  private async readHistoryPage(
    db: IDBDatabase,
    options: PageOptions,
    itemId?: string,
  ) {
    const transaction = db.transaction(["ITEM_PRICE_CHANGES", "PRODUCTS"]);
    const store = transaction.objectStore("ITEM_PRICE_CHANGES");
    const result = await readListingPage<ItemPriceChangeSchema>(
      [store],
      { ...options, sort: options.sort === "oldest" ? "oldest" : "newest" },
      { start: 0, end: Number.MAX_SAFE_INTEGER, all: true },
      itemId ? contactScope(itemId) : "all",
    );
    const rows = await Promise.all(
      result.rows.map(
        (row) =>
          new Promise<PriceHistoryEntry>((resolve, reject) => {
            const product = transaction.objectStore("PRODUCTS").get(row.itemId);
            const previous = store
              .index("itemTimestamp")
              .openCursor(
                IDBKeyRange.bound(
                  [row.itemId],
                  [row.itemId, row.timestamp],
                  false,
                  true,
                ),
                "prev",
              );
            product.onerror = () => reject(product.error);
            previous.onerror = () => reject(previous.error);
            previous.onsuccess = () => {
              if (!product.result) {
                reject(new Error(getLocaleText("UI_UNAVAILABLE_ITEM")));
                return;
              }
              resolve({
                ...row,
                itemName: product.result.name,
                deletedAt: product.result.deletedAt,
                previousAmount:
                  previous.result?.value.amount ?? product.result.amount,
              });
            };
          }),
      ),
    );
    return { ...result, rows };
  }

  public async getPriceAt(
    itemId: string,
    timestamp = Number.MAX_SAFE_INTEGER,
  ): Promise<number | undefined> {
    const db = await this.db.getDatabase();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(this.getObjectStoreName())
        .objectStore(this.getObjectStoreName())
        .index("itemTimestamp")
        .openCursor(
          IDBKeyRange.bound([itemId, 0], [itemId, timestamp]),
          "prev",
        );
      request.onsuccess = () => resolve(request.result?.value.amount);
      request.onerror = () => reject(request.error);
    });
  }
}
