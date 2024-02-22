import Customer, { ICustomer } from "../model/Customer";
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

  public getSchemaAsObject(schema: CustomerSchema): Promise<Customer> {
    return new Promise((resolve, reject) => {
      resolve(new Customer(schema));
    });
  }
}
