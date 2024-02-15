import { IItem } from "./Item";

export enum TransactionItemType {
  PRODUCT,
  DISCOUNT,
}

export interface ITransactionItemViewer {
  getId: () => string;
  getItem: () => IItem;
  getQuantity: () => number;
  getIsQuantityChangable: () => boolean;
  getType: () => TransactionItemType;
  getPrice: () => number;
}

export interface ITransactionItem extends ITransactionItemViewer {
  setQuantity: (quantity: number) => void;
}

export interface TransactionItemParams {
  id: string;
  item: IItem;
  quantity?: number;
  isQuantityChangeable?: boolean;
  type?: TransactionItemType;
}

export default class TransactionItem
  extends EventTarget
  implements ITransactionItemViewer
{
  private id: string;
  private item: IItem;
  private quantity: number;
  private isQuantityChangeable: boolean;
  private type: TransactionItemType;

  constructor({
    id,
    item,
    quantity = 1,
    isQuantityChangeable = true,
    type = TransactionItemType.PRODUCT,
  }: TransactionItemParams) {
    super();
    this.id = id;
    this.item = item;
    this.quantity = quantity;
    this.isQuantityChangeable = isQuantityChangeable;
    this.type = type;

    if (this.type === TransactionItemType.DISCOUNT) {
      this.isQuantityChangeable = false;
    }
  }

  public setQuantity(quantity: number) {
    this.quantity = quantity;

    this.dispatchEvent(
      new CustomEvent("quantity-change", {
        detail: { quantity: this.quantity },
      })
    );
  }

  public getId() {
    return this.id;
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
