import { ICustomer } from "./Customer";
import { ITransactions } from "./Transactions";

export interface ICustomerTransaction {
  getCustomer: () => ICustomer;
  getTransactions: () => ITransactions;
}

export default class CustomerTransaction implements ICustomerTransaction {
  private customer: ICustomer;
  private transactions: ITransactions;

  constructor(customer: ICustomer, transactions: ITransactions) {
    this.customer = customer;
    this.transactions = transactions;
  }

  public getTransactions() {
    return this.transactions;
  }

  public getCustomer() {
    return this.customer;
  }
}
