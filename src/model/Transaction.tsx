import { IItem } from "./Item";
import TransactionItem, {
  ITransactionItemViewer,
  ITransactionItem,
  TransactionItemType,
} from "./TransactionItem";

import { v4 as uuidv4 } from "uuid";

export interface ITransactionViewer {
  getTimestamp: () => number;
  getId: () => string;
  getItems: () => ITransactionItemViewer[];
  getItemsByType: (type: TransactionItemType) => ITransactionItemViewer[];
  getItem: (id: string) => ITransactionItemViewer | undefined;
  getTotal: () => number;
}

export interface ITransaction extends ITransactionViewer {
  /**
   * Adds an item to the transaction
   * @param item the item to be added
   * @returns
   */
  addItem: (item: IItem) => ITransactionItemViewer;

  /**
   * Decrements the quantity of an item from the transaction
   * @param id the item id
   * @returns the decremented item
   */
  decrementItem: (id: string) => ITransactionItemViewer | null;

  removeItem: (id: string) => ITransactionItemViewer | null;

  getLastItem: () => ITransactionItemViewer | null;

  changeItemQuantity: (
    transactionItem: ITransactionItemViewer,
    quantity: number
  ) => void;

  addTransactionItem: (
    transactionItem: ITransactionItem
  ) => ITransactionItemViewer;
}

export default class Transaction implements ITransaction {
  private timestamp: number;
  private id: string;
  private transactionItems: ITransactionItem[];
  private total: number;

  constructor(id?: string, timestamp?: number) {
    this.id = id || uuidv4();
    this.timestamp = timestamp || Date.now();
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

  public getTimestamp() {
    return this.timestamp;
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

  public addItem(item: IItem): ITransactionItemViewer {
    let transactionItem: ITransactionItem | undefined =
      this.transactionItems.find((t) => t.getItem().getId() === item.getId());

    if (transactionItem) {
      transactionItem.setQuantity(transactionItem.getQuantity() + 1);
    } else {
      transactionItem = new TransactionItem({ id: this.getId(), item });
      this.addTransactionItem(transactionItem);
    }
    return transactionItem;
  }

  public decrementItem(id: string) {
    const index = this.transactionItems.findIndex(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
    if (index < 0) return null;
    const transactionItem = this.transactionItems[index];
    if (transactionItem.getQuantity() > 1) {
      transactionItem.setQuantity(transactionItem.getQuantity() - 1);
    } else {
      this.transactionItems.splice(index, 1)[0];
    }
    this.calculateTotal();
    return transactionItem;
  }

  public getLastItem() {
    return this.transactionItems[this.transactionItems.length - 1];
  }

  public removeItem(id: string) {
    const itemIndex = this.transactionItems.findIndex(
      (transactionItem) => transactionItem.getItem().getId() === id
    );

    const transactionItem =
      itemIndex >= 0 ? this.transactionItems.splice(itemIndex, 1)[0] : null;
    this.calculateTotal();
    return transactionItem;
  }

  public changeItemQuantity(
    transactionItem: ITransactionItemViewer,
    quantity: number
  ) {
    this.transactionItems
      .find((t) => t === transactionItem)
      ?.setQuantity(quantity);
  }

  public addTransactionItem(transactionItem: ITransactionItem) {
    this.transactionItems.push(transactionItem);
    this.calculateTotal();
    return transactionItem;
  }
}
