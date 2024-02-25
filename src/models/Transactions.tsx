import { ITransaction } from "./Transaction";

export interface ITransactions {
  getTotal: () => number;
  getAllTransactions: () => ITransaction[];

  removeTransaction: (id: string) => ITransaction | null;
  addTransaction: (transaction: ITransaction) => void;
}

export default class Transactions implements ITransactions {
  private transactions: ITransaction[];
  private total: number;

  constructor(transactions: ITransaction[] = []) {
    this.total = 0;
    this.transactions = transactions;
    this.calculateTotal();
  }

  private calculateTotal() {
    this.total = this.transactions.reduce(
      (accumulatedTotal, transaction) =>
        accumulatedTotal + transaction.getTotal(),
      0
    );
  }

  public getTotal() {
    this.calculateTotal();
    return this.total;
  }

  public getAllTransactions() {
    return this.transactions;
  }

  public addTransaction(transaction: ITransaction) {
    this.transactions.push(transaction);
    this.calculateTotal();
  }

  public removeTransaction(id: string) {
    const index = this.transactions.findIndex(
      (transaction) => transaction.getId() === id
    );
    if (index < 0) return null;
    const transaction = this.transactions.splice(index, 1)[0];
    this.calculateTotal();
    return transaction;
  }
}
