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

  /** Update only an existing record, retaining its ID and transaction links. */
  public async updateOne(customer: Customer): Promise<Customer> {
    const db = await this.db.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.objectStoreName, 'readwrite');
      const store = transaction.objectStore(this.objectStoreName);
      let message = 'Customer could not be saved.';
      transaction.oncomplete = () => resolve(customer);
      transaction.onabort = () => reject(new Error(message));
      const request = store.get(customer.getId());
      request.onsuccess = () => {
        if (!request.result) {
          message = 'This customer no longer exists. Reload the customer list.';
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
