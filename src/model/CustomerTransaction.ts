import { ICustomer } from "./Customer";
import { ITransaction } from "./Transaction";

export interface ICustomerTransaction {
  getCustomer: () => ICustomer;
  getTransaction: () => ITransaction;
  getId: () => string;
  getTimestamp: () => number;
}

interface CustomerTransactionParams {
  id: string;
  timestamp: number;
  customer: ICustomer;
  transaction: ITransaction;
}

export default class CustomerTransaction implements ICustomerTransaction {
  private id: string;
  private timestamp: number;
  private customer: ICustomer;
  private transaction: ITransaction;

  constructor({
    id,
    timestamp,
    customer,
    transaction,
  }: CustomerTransactionParams) {
    this.id = id;
    this.timestamp = timestamp;
    this.customer = customer;
    this.transaction = transaction;
  }
  getTimestamp() {
    return this.timestamp;
  }

  public getTransaction() {
    return this.transaction;
  }

  public getCustomer() {
    return this.customer;
  }

  public getId() {
    return this.id;
  }
}
