import { IComparable } from "../Data-Structures/UniqueSet";

export interface IItem {
  getId: () => string;
  getName: () => string;
  getAmount: () => number;
}

export interface ItemParams {
  id: string;
  name: string;
  amount: number;
}

export default class Item implements IItem, IComparable {
  protected id: string;
  protected name: string;
  protected amount: number;

  constructor({ id, name, amount }: ItemParams) {
    this.id = id;
    this.name = name;
    this.amount = amount;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getAmount(): number {
    return this.amount;
  }
}
