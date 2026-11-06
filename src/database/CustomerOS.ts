import { getLocaleText } from '../contexts/Locale';
import Customer, { ICustomer } from "../models/Customer";
import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface CustomerSchema {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface ICustomerOS extends IObjectStore<CustomerSchema, Customer> {
  // addOne: (customer: ICustomer) => void;
}

export default class CustomerOS
  extends ObjectStore<CustomerSchema, Customer>
  implements IObjectStoreDB, ICustomerOS
{
  private static OBJECT_STORE_NAME = "CUSTOMER";
  constructor(db: IDB) {
    super(db, CustomerOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore, db: IDB) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(customer: ICustomer) {
    return {
      id: customer.getId(),
      name: customer.getName(),
      phoneNumber: customer.getPhoneNumber(),
    } as CustomerSchema;
  }

  public async deleteOne(id: string): Promise<Customer> {
    const customer = await this.getOne(id);
    const db = await this.db.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.objectStoreName, 'CUSTOMERS_TRANSACTIONS'], 'readwrite');
      let message = getLocaleText('CUSTOMER_DELETE_FAILED');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const count = transaction.objectStore('CUSTOMERS_TRANSACTIONS').index('customerId').count(id);
      count.onsuccess = () => {
        if (count.result) { message = getLocaleText('CUSTOMER_HAS_TRANSACTIONS'); transaction.abort(); return; }
        transaction.objectStore(this.objectStoreName).delete(id);
      };
    });
    return customer;
  }

  /** Update only an existing record, retaining its ID and transaction links. */
  public async updateOne(customer: Customer): Promise<Customer> {
    const db = await this.db.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.objectStoreName, 'readwrite');
      const store = transaction.objectStore(this.objectStoreName);
      let message = getLocaleText('UI_CUSTOMER_COULD_NOT_BE_SAVED');
      transaction.oncomplete = () => resolve(customer);
      transaction.onabort = () => reject(new Error(message));
      const request = store.get(customer.getId());
      request.onsuccess = () => {
        if (!request.result) {
          message = getLocaleText('UI_THIS_CUSTOMER_NO_LONGER_EXISTS_RELOAD_THE_CUSTOMER_LIST');
          transaction.abort();
          return;
        }
        store.put(this.getObjectAsSchema(customer));
      };
    });
  }

  public getSchemaAsObject(schema: CustomerSchema): Promise<Customer> {
    return new Promise((resolve, reject) => {
      resolve(new Customer(schema));
    });
  }
}
