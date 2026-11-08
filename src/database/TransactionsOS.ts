import { PICKER_USAGE_UPDATED } from "../pickers/events";
import { indexedHeader, createListingIndexes } from "./listing/metadata";
import { validQuantity, roundQuantity } from "../validators/QuantityValidator";
import TransactionHistoryStore from "./TransactionHistoryStore";
import { loadSettings } from "../settings/settings";
import { publishStockChange } from "../stock/events";
import { getLocaleText } from "../localization/locale";
import { PageOptions, requestValue } from "./Pagination";
import { TransactionListEntry } from "../models/TransactionListEntry";
import Transaction, { ITransaction } from "../models/Transaction";
import { IDB } from "./Database";
import ObjectStore, {
  IObjectStore,
  ObjectRequestError,
  ObjectRequestErrorsTypes,
} from "./ObjectStore";
import { ITransactionDiscountsOS } from "./TransactionDiscountsOS";
import { ITransactionProductsOS } from "./TransactionProductsOS";

export interface TransactionsSchema {
  timestamp: number;
  id: string;
  total: number;
  deletedAt?: number;
  stockDeducted?: number;
  stockReversed?: number;
  kind?: "sale" | "payment";
  listItemCount?: number;
  listCustomerIds?: string[];
}

export interface ITransactionsOS extends IObjectStore<
  TransactionsSchema,
  Transaction
> {
  getListEntries: (
    ids: string[],
    headers?: TransactionsSchema[],
  ) => Promise<TransactionListEntry[]>;
  getAllTransactionsByTimestamp: () => Promise<ITransaction[]>;

  getLatestTransaction: (
    currenltyViewingTransaction?: ITransaction | null,
  ) => Promise<Transaction | null>;

  postTransaction: (transaction: Transaction) => Promise<Transaction>;
}

export default class TransactionsOS
  extends ObjectStore<TransactionsSchema, Transaction>
  implements ITransactionsOS
{
  private static OBJECT_STORE_NAME = "TRANSACTIONS";
  private transactionItemsOS: ITransactionProductsOS;
  private transactionDiscountsOS: ITransactionDiscountsOS;
  constructor(
    db: IDB,
    transactionItemsOS: ITransactionProductsOS,
    transactionDiscountsOS: ITransactionDiscountsOS,
  ) {
    super(db, TransactionsOS.OBJECT_STORE_NAME);
    this.transactionItemsOS = transactionItemsOS;
    this.transactionDiscountsOS = transactionDiscountsOS;
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    createListingIndexes(objectStore);
    objectStore.createIndex("timestamp", "timestamp", { unique: true });
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("deletedTimestamp", ["timestamp", "deletedAt"]);
  }

  public onDatabaseUpgrade(database: IDBDatabase, transaction: IDBTransaction) {
    const store = transaction.objectStore(TransactionsOS.OBJECT_STORE_NAME);
    if (!store.indexNames.contains("deletedTimestamp"))
      store.createIndex("deletedTimestamp", ["timestamp", "deletedAt"]);
    createListingIndexes(store);
  }

  public getObjectAsSchema(object: ITransaction) {
    return indexedHeader(
      {
        timestamp: object.getTimestamp(),
        id: object.getId(),
        total: object.getTotal(),
        kind: object.getKind(),
      },
      object.getKind(),
      [],
      object.getAllTransactionProductItems().length +
        object.getAllTransactionDiscountItems().length,
    );
  }

  public async getSchemaAsObject(
    schema: TransactionsSchema,
  ): Promise<Transaction> {
    let transactionProductItems, transactionDiscountItems;
    const transaction = new Transaction(
      schema.id,
      schema.timestamp,
      schema.kind === "payment" ? -schema.total : undefined,
    );
    try {
      transactionProductItems =
        await this.transactionItemsOS.getAllByTransactionId(
          schema.id,
          schema.timestamp,
        );
      transactionDiscountItems =
        await this.transactionDiscountsOS.getAllByTransactionId(schema.id);

      transactionProductItems.forEach((item) =>
        transaction.addTransactionProductItem(item),
      );

      transactionDiscountItems.forEach((item) =>
        transaction.addTransactionDiscountItem(item),
      );
    } catch (err) {
      const unknownError = err as ObjectRequestError;
      if (
        unknownError &&
        unknownError.type === ObjectRequestErrorsTypes.EMPTY_RESPONSE
      ) {
        console.log(unknownError.defaultMessage);
      } else {
        console.error(err);
      }
    }
    transaction.deletedAt = schema.deletedAt;
    transaction.setIsPosted(true);
    return transaction;
  }

  public async getPage(options: PageOptions) {
    const result = await new TransactionHistoryStore(this.db).getPage(options, {
      start: 0,
      end: Number.MAX_SAFE_INTEGER,
      all: true,
    });
    return {
      ...result,
      rows: await this.getListEntries(
        result.rows.map((row) => row.id),
        result.rows,
      ),
    };
  }

  /** Load headers and indexed line counts only for the selected transaction IDs. */
  public async getListEntries(
    ids: string[],
    headers?: TransactionsSchema[],
  ): Promise<TransactionListEntry[]> {
    if (!ids.length) return [];
    if (headers?.every((row) => row.listItemCount !== undefined))
      return headers.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        total: row.total,
        kind: row.kind,
        deletedAt: row.deletedAt,
        itemCount: row.listItemCount!,
      }));
    const db = await this.db.getDatabase();
    const transaction = db.transaction([
      "TRANSACTIONS",
      "TRANSACTION_PRODUCTS",
      "TRANSACTION_DISCOUNTS",
    ]);
    const supplied = new Map(headers?.map((row) => [row.id, row]));
    const reads = ids.map((id) =>
      Promise.all([
        headers
          ? Promise.resolve(supplied.get(id))
          : (requestValue(
              transaction.objectStore("TRANSACTIONS").get(id),
            ) as Promise<TransactionsSchema | undefined>),
        requestValue(
          transaction
            .objectStore("TRANSACTION_PRODUCTS")
            .index("transactionId")
            .count(id),
        ),
        requestValue(
          transaction
            .objectStore("TRANSACTION_DISCOUNTS")
            .index("transactionId")
            .count(id),
        ),
      ]).then(([sale, products, discounts]) => {
        if (!sale)
          throw new Error(getLocaleText("PAGINATION_TRANSACTION_MISSING"));
        return { ...sale, itemCount: products + discounts };
      }),
    );
    return Promise.all(reads);
  }

  public async getAllTransactionsByTimestamp() {
    return await this.getAllByIndexName("timestamp");
  }

  public async getLatestTransaction(
    currenltyViewingTransaction?: ITransaction | null,
  ): Promise<Transaction | null> {
    const os = await this.getReadOnlyObjectStore();
    return new Promise<Transaction | null>((resolve, reject) => {
      const timestampIndex = os.index("timestamp");
      const cursorReq = timestampIndex.openCursor(
        currenltyViewingTransaction
          ? IDBKeyRange.upperBound(
              currenltyViewingTransaction?.getTimestamp(),
              true,
            )
          : null,
        "prev",
      );

      cursorReq.onsuccess = (event: Event) => {
        const cursor: IDBCursorWithValue = (event.target as IDBRequest).result;
        if (cursor?.value.deletedAt) {
          cursor.continue();
          return;
        }
        if (cursor) {
          resolve(this.getSchemaAsObject(cursor.value));
        } else {
          resolve(null);
        }
      };

      cursorReq.onerror = () => {
        console.log("ERROR");
        reject("Error");
      };
    });
  }

  /** Sale header, line items and stock changes commit together, or all roll back. */
  public async postTransaction(sale: Transaction) {
    if (sale.getKind() === "payment")
      throw new Error(getLocaleText("PAYMENT_CUSTOMER_REQUIRED"));
    if (sale.isPosted()) throw new Error(getLocaleText("STOCK_ALREADY_POSTED"));
    const settings = loadSettings();
    const products = sale.getAllTransactionProductItems();
    const discounts = sale.getAllTransactionDiscountItems();
    const quantities = new Map<string, { quantity: number; name: string }>();
    for (const line of products) {
      const id = line.getItem().getId();
      const quantity = (quantities.get(id)?.quantity ?? 0) + line.getQuantity();
      if (!validQuantity(quantity))
        throw new Error(getLocaleText("QUANTITY_INVALID"));
      quantities.set(id, { quantity, name: line.getItem().getName() });
    }
    const warnings: string[] = [];
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [
          "TRANSACTIONS",
          "TRANSACTION_PRODUCTS",
          "TRANSACTION_DISCOUNTS",
          "PRODUCTS",
          "STOCK",
        ],
        "readwrite",
      );
      let message = getLocaleText("NOTIFICATION_POST_FAILED");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      try {
        transaction.objectStore("TRANSACTIONS").add({
          ...this.getObjectAsSchema(sale),
          stockDeducted: settings.stockManagement ? 1 : 0,
          ...indexedHeader(
            this.getObjectAsSchema(sale),
            "sale",
            [],
            products.length + discounts.length,
          ),
        });
        for (const line of products)
          transaction
            .objectStore("TRANSACTION_PRODUCTS")
            .add(this.transactionItemsOS.getObjectAsSchema(line));
        for (const line of discounts)
          transaction
            .objectStore("TRANSACTION_DISCOUNTS")
            .add(this.transactionDiscountsOS.getObjectAsSchema(line));
        for (const [id, item] of quantities) {
          const product = transaction.objectStore("PRODUCTS").get(id);
          product.onsuccess = () => {
            if (
              !product.result ||
              product.result.deletedAt ||
              product.result.canSell === 0
            ) {
              message = getLocaleText("UI_UNAVAILABLE_ITEM");
              transaction.abort();
              return;
            }
            if (!settings.stockManagement) return;
            const stock = transaction.objectStore("STOCK");
            const count = stock.get(id);
            count.onsuccess = () => {
              const available = count.result?.count ?? 0;
              if (item.quantity > available) {
                const warning = getLocaleText("STOCK_SHORTAGE", {
                  item: item.name,
                  available,
                  requested: item.quantity,
                });
                if (settings.forceStockAdherence) {
                  message = warning;
                  transaction.abort();
                  return;
                }
                warnings.push(warning);
              }
              const remaining = roundQuantity(available - item.quantity);
              if (!validQuantity(Math.abs(remaining), true)) {
                message = getLocaleText("STOCK_INVALID");
                transaction.abort();
                return;
              }
              stock.put({ id, count: remaining });
            };
          };
        }
      } catch {
        transaction.abort();
      }
    });
    sale.setIsPosted(true);
    window.dispatchEvent(new Event(PICKER_USAGE_UPDATED));
    if (settings.stockManagement) publishStockChange(warnings);
    return sale;
  }
}
