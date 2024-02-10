import { ItemSchema } from "../database/ItemDB";

export interface IItem {
  getId: () => string;
  getName: () => string;
  getPrice: () => number;
}

export class Item implements IItem {
  private id: string;
  private name: string;
  private price: number;

  constructor({ id, name, price }: ItemSchema) {
    this.id = id;
    this.name = name;
    this.price = price;
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getPrice() {
    return this.price;
  }
}
