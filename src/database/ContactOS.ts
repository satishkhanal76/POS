import { ensureListings } from "./listing/maintenance";
import coalesceRead from "./listing/coalesceRead";
import readCatalogPage, {
  indexedCatalog,
  createCatalogIndex,
} from "./listing/catalog";
import { PageOptions } from "./Pagination";
import { getLocaleText } from "../contexts/Locale";
import Contact, { IContact } from "../models/Contact";
import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface ContactSchema {
  id: string;
  deletedAt?: number;
  name: string;
  phoneNumber: string;
}

export interface IContactOS extends IObjectStore<ContactSchema, Contact> {
  // addOne: (customer: IContact) => void;
}

export default class ContactOS
  extends ObjectStore<ContactSchema, Contact>
  implements IObjectStoreDB, IContactOS
{
  // Keep the existing physical store name so upgrading never copies or duplicates contact IDs.
  private static OBJECT_STORE_NAME = "CUSTOMER";
  constructor(db: IDB) {
    super(db, ContactOS.OBJECT_STORE_NAME);
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
    createCatalogIndex(transaction.objectStore("CUSTOMER"));
  }

  public async getCatalogPage(options: PageOptions, search = "") {
    const database = await this.db.getDatabase();
    await ensureListings(database, ["CUSTOMER"]);
    return coalesceRead(database, JSON.stringify(['catalog-models', 'CUSTOMER', options, search]), async () => {
      const result = await readCatalogPage<ContactSchema>(
        database.transaction("CUSTOMER").objectStore("CUSTOMER"),
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

  public getObjectAsSchema(customer: IContact) {
    return indexedCatalog({
      id: customer.getId(),
      ...(customer.deletedAt ? { deletedAt: customer.deletedAt } : {}),
      name: customer.getName(),
      phoneNumber: customer.getPhoneNumber(),
    } as ContactSchema);
  }

  /** Update only an existing record, retaining its ID and transaction links. */
  public async updateOne(customer: Contact): Promise<Contact> {
    const db = await this.db.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.objectStoreName, "readwrite");
      const store = transaction.objectStore(this.objectStoreName);
      let message = getLocaleText("UI_CUSTOMER_COULD_NOT_BE_SAVED");
      transaction.oncomplete = () => resolve(customer);
      transaction.onabort = () => reject(new Error(message));
      const request = store.get(customer.getId());
      request.onsuccess = () => {
        if (!request.result) {
          message = getLocaleText(
            "UI_THIS_CUSTOMER_NO_LONGER_EXISTS_RELOAD_THE_CUSTOMER_LIST",
          );
          transaction.abort();
          return;
        }
        customer.deletedAt = request.result.deletedAt;
        store.put({ ...request.result, ...this.getObjectAsSchema(customer) });
      };
    });
  }

  public async getSchemaAsObject(schema: ContactSchema): Promise<Contact> {
    return Object.assign(new Contact(schema), { deletedAt: schema.deletedAt });
  }
}
