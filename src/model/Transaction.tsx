import { ITransactionItem, TransactionItemType } from "./TransactionItem";

export interface ITransaction {
  getId: () => string;
  getItems: () => ITransactionItem[];
  getItemsByType: (type: TransactionItemType) => ITransactionItem[];
  getItem: (id: string) => ITransactionItem | undefined;
  getTotal: () => number;

  /**
   * Adds an item to the transaction
   * @param item the item to be added
   * @returns
   */
  addItem: (item: ITransactionItem) => void;

  /**
   * Removes an item from the transaction
   * @param id the item id
   * @returns the removed item
   */
  removeItem: (id: string) => ITransactionItem | null;
}

export default class Transaction implements ITransaction {
  private id: string;
  private transactionItems: ITransactionItem[];
  private total: number;

  constructor(id: string) {
    this.id = id;
    this.transactionItems = [];
    this.total = 0;
  }

  private calculateTotal() {
    this.total = this.transactionItems.reduce(
      (previousValue, transactionItem) => {
        return previousValue + transactionItem.getPrice();
      },
      0
    );
  }

  public getId() {
    return this.id;
  }

  public getItems() {
    return this.transactionItems;
  }

  public getItemsByType(type: TransactionItemType) {
    return this.transactionItems.filter(
      (transactionItem) => transactionItem.getType() === type
    );
  }

  public getItem(id: string) {
    return this.transactionItems.find(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
  }

  public getTotal() {
    this.calculateTotal();
    return this.total;
  }

  public addItem(transactionItems: ITransactionItem) {
    this.transactionItems.push(transactionItems);
    this.calculateTotal();
  }

  public removeItem(id: string) {
    const index = this.transactionItems.findIndex(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
    if (index < 0) return null;
    const transactionItem = this.transactionItems.splice(index, 1)[0];
    this.calculateTotal();
    return transactionItem;
  }
}
