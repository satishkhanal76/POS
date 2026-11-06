import { getLocaleText } from '../contexts/Locale';
import Customer, { ICustomer } from "../models/Customer";
import { IDB, IObjectStoreDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface CustomerSchema {
  id: string;
  deletedAt?: number;
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

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(customer: ICustomer) {
    return {
      id: customer.getId(),
      ...(customer.deletedAt ? { deletedAt: customer.deletedAt } : {}),
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
        customer.deletedAt = request.result.deletedAt;
        store.put({ ...request.result, ...this.getObjectAsSchema(customer) });
      };
    });
  }

  public async getSchemaAsObject(schema: CustomerSchema): Promise<Customer> {
    return Object.assign(new Customer(schema), { deletedAt: schema.deletedAt });
  }
}
