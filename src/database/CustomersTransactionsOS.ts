import CustomerTransaction, {
  ICustomerTransaction,
} from "../model/CustomerTransaction";
import CustomerTransactions from "../model/CustomerTransactions";
import { ICustomerOS } from "./CustomerOS";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";
import { ITransactionsOS } from "./TransactionsOS";

export interface CustomerTransactionsSchema {
  timestamp: number;
  id: string;
  customerId: string;
  transactionId: string;
}

export interface ICustomersTransactionsOS
  extends IObjectStore<CustomerTransactionsSchema, CustomerTransaction> {
  getCustomerTransactions: (
    cutomerId: string
  ) => Promise<CustomerTransaction[]>;
}

export default class CustomersTransactionsOS
  extends ObjectStore<CustomerTransactionsSchema, CustomerTransaction>
  implements
    ICustomersTransactionsOS,
    IObjectStore<CustomerTransactionsSchema, CustomerTransaction>
{
  private static OBJECT_STORE_NAME = "CUSTOMERS_TRANSACTIONS";

  private customerOS: ICustomerOS;
  private transactionsOS: ITransactionsOS;

  constructor(
    db: IDB,
    customerOS: ICustomerOS,
    transactionsOS: ITransactionsOS
  ) {
    super(db, CustomersTransactionsOS.OBJECT_STORE_NAME);
    this.customerOS = customerOS;
    this.transactionsOS = transactionsOS;
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

  public async getSchemaAsObject(
    schema: CustomerTransactionsSchema
  ): Promise<CustomerTransaction> {
    const customer = await this.customerOS.getOne(schema.customerId);
    const transaction = await this.transactionsOS.getOne(schema.transactionId);
    const customerTransaction = new CustomerTransaction({
      ...schema,
      customer: customer,
      transaction: transaction,
    });
    return customerTransaction;
  }

  public async getCustomerTransactions(customerId: string) {
    return this.getAllByIndexName("customerId", customerId);
  }

  public async getAllCustomersTransactions() {
    return this.getAllByIndexName("customerId");
  }
}
