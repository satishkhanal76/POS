import { ICustomerTransaction } from "../model/CustomerTransaction";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface CustomersTransactionsSchema {
  timestamp: number;
  id: string;
  customerId: string;
  transactionId: string;
}

export interface ICustomersTransactionsOS
  extends IObjectStore<CustomersTransactionsSchema, ICustomerTransaction> {
  getCustomerTransactions: (cutomerId: string) => CustomersTransactionsSchema[];
}

export default class CustomersTransactionsOS extends ObjectStore<
  CustomersTransactionsSchema,
  ICustomerTransaction
> {
  private static OBJECT_STORE_NAME = "CUSTOMERS_TRANSACTIONS";

  constructor(db: IDB) {
    super(db, CustomersTransactionsOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore) {
    objectStore.createIndex("timestamp", "timestamp", { unique: true });
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("customerId", "customerId", { unique: false });
    objectStore.createIndex("transactionId", "transactionId", {
      unique: false,
    });
  }

  public getObjectAsSchema(object: ICustomerTransaction) {
    return {
      timestamp: object.getTimestamp(),
      id: object.getId(),
      customerId: object.getCustomer().getId(),
      transactionId: object.getTransaction().getId(),
    };
  }

  public async getCustomerTransactions(customerId: string) {
    const customerIdIndex = (await this.getReadOnlyObjectStore()).index(
      "customerId"
    );
    return customerIdIndex.getAll(customerId);
  }
}
