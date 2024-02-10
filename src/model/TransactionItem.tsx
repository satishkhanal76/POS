import { IItem } from "./Item";

export enum TransactionItemType {
  PRODUCT,
  DISCOUNT,
}

export interface ITransactionItem {
  getItem: () => IItem;
  getQuantity: () => number;
  getIsQuantityChangable: () => boolean;
  getType: () => TransactionItemType;
  getPrice: () => number;
}

export interface TransactionItemParams {
  item: IItem;
  quantity: number;
  isQuantityChangeable: boolean;
  type: TransactionItemType;
}

export default class TransactionItem implements ITransactionItem {
  private item: IItem;
  private quantity: number;
  private isQuantityChangeable: boolean;
  private type: TransactionItemType;

  constructor({
    item,
    quantity = 1,
    isQuantityChangeable = true,
    type = TransactionItemType.PRODUCT,
  }: TransactionItemParams) {
    this.item = item;
    this.quantity = quantity;
    this.isQuantityChangeable = isQuantityChangeable;
    this.type = type;

    if (this.type === TransactionItemType.DISCOUNT) {
      this.isQuantityChangeable = false;
    }
  }
  public getItem() {
    return this.item;
  }
  public getQuantity() {
    return this.quantity;
  }
  public getIsQuantityChangable() {
    return this.isQuantityChangeable;
  }
  public getType() {
    return this.type;
  }
  public getPrice() {
    return this.quantity * this.item.getPrice();
  }
}
