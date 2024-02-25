import Item from "./Item";

export interface ITransactionItem<G> {
  getId: () => string;
  getQuantity: () => number;
  getIsQuantityChangable: () => boolean;

  getAmount: () => number;

  getItem: () => G;

  setQuantity: (quantity: number) => void;
}

export interface TransactionItemParams<G> {
  id: string;
  item: G;
  quantity?: number;
  isQuantityChangable?: boolean;
}

export default class TransactionItem<G extends Item>
  implements ITransactionItem<G>
{
  protected id: string;
  protected quantity: number;
  protected isQuantityChangable: boolean;
  protected item: G;

  constructor({
    id,
    item,
    quantity = 1,
    isQuantityChangable = true,
  }: TransactionItemParams<G>) {
    this.id = id;
    this.item = item;
    this.quantity = quantity;
    this.isQuantityChangable = isQuantityChangable;
  }

  public getId() {
    return this.id;
  }

  public getQuantity(): number {
    return this.quantity;
  }

  public getIsQuantityChangable(): boolean {
    return this.isQuantityChangable;
  }

  public getAmount(): number {
    return this.quantity * this.item.getAmount();
  }

  public getItem(): G {
    return this.item;
  }

  public setQuantity(quantity: number) {
    if (!this.isQuantityChangable) {
      return;
    }
    this.quantity = quantity;
  }
}
