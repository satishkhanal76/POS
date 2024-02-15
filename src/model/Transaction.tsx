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

  doesItemExist: (id: string) => boolean;

  getLastItem: () => ITransactionItemViewer | null;

  /**
   *
   * @returns if the transaction has any items in it
   */
  hasItems: () => boolean;

  /**
   *  Checks if the transaction is posted to the database
   * @returns if the transaction is posted
   */
  isPosted: () => boolean;
}

export interface ITransaction extends ITransactionViewer {
  /**
   * Adds an item to the transaction
   * @param item the item to be added
   * @returns
   */
  addItem: (item: IItem) => ITransactionItemViewer;

  addItems: (item: IItem[]) => ITransactionItemViewer[];

  /**
   * Decrements the quantity of an item from the transaction
   * @param id the item id
   * @returns the decremented item
   */
  decrementItem: (id: string) => ITransactionItemViewer | null;

  removeItem: (id: string) => ITransactionItemViewer | null;

  changeItemQuantity: (id: string, quantity: number) => void;

  setIsPosted: (isPosted: boolean) => void;
}

export interface ITransactionCreator extends ITransaction {
  addTransactionItem: (
    transactionItem: ITransactionItem
  ) => ITransactionItemViewer;
  addTransactionItems: (
    transactionItems: ITransactionItem[]
  ) => ITransactionItemViewer[];
}

export default class Transaction
  implements ITransaction, ITransactionViewer, ITransactionCreator
{
  private timestamp: number;
  private id: string;
  private transactionItems: ITransactionItem[];
  private total: number;
  private hasBeenPosted: boolean;

  constructor(id?: string, timestamp?: number) {
    this.id = id || uuidv4();
    this.timestamp = timestamp || Date.now();
    this.transactionItems = [];
    this.total = 0;
    this.hasBeenPosted = false;
  }

  public addTransactionItems(transactionItems: ITransactionItem[]) {
    this.transactionItems.push(...transactionItems);
    this.calculateTotal();

    return transactionItems;
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

  public addItem(item: IItem) {
    let transactionItem = this.getItem(item.getId());
    if (transactionItem) {
      transactionItem.setQuantity(transactionItem.getQuantity() + 1);
    } else {
      transactionItem = new TransactionItem({ id: this.getId(), item });

      this.addTransactionItem(transactionItem);
    }
    return transactionItem as ITransactionItemViewer;
  }
  public addItems(items: IItem[]): ITransactionItemViewer[] {
    return items.map((item) => this.addItem(item));
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

  public changeItemQuantity(id: string, quantity: number) {
    this.transactionItems
      .find((t) => t.getItem().getId() === id)
      ?.setQuantity(quantity);
  }

  public addTransactionItem(transactionItem: ITransactionItem) {
    this.transactionItems.push(transactionItem);
    this.calculateTotal();
    return transactionItem;
  }

  public hasItems() {
    return this.transactionItems.length !== 0;
  }

  public setIsPosted(isPosted: boolean) {
    this.hasBeenPosted = isPosted;
  }

  public isPosted() {
    return this.hasBeenPosted;
  }

  public doesItemExist(id: string) {
    return (
      this.transactionItems.find(
        (transactionItem) => transactionItem.getItem().getId() === id
      ) !== undefined
    );
  }
}
