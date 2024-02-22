import ItemOS, { ItemSchema } from "../database/ItemOS";
import { IItem, Item } from "../model/Item";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";

export interface IItemsController<S, I, OS> extends IController<S, I, OS> {
  handleFormSubmit: (data: IItemFormData) => Promise<I | null>;

  getAllItems: () => Promise<I[]>;

  deleteItem: (item: I) => Promise<I | null>;
}

export interface IItemFormData {
  name: string;
  price: number;
}

export default class ItemsController
  extends Controller<ItemSchema, Item, ItemOS>
  implements IItemsController<ItemSchema, Item, ItemOS>
{
  private items: Item[];

  constructor(itemOS: ItemOS) {
    super(itemOS);

    this.items = [];
  }

  public async handleFormSubmit({ name, price }: IItemFormData) {
    if (name === "" || price == 0) return null;
    const item = new Item({ id: uuidv4(), name, price } as ItemSchema);
    this.items.push(item);
    return this.addOne(item);
  }

  public async getAllItems() {
    if (this.items.length <= 0) {
      const items = await this.getAll();
      this.items.push(...items);
    }
    return this.items;
  }

  public async deleteItem(item: IItem) {
    const deleted = await this.deleteOne(item.getId());
    if (deleted) {
      return deleted;
    }
    return null;
  }
}
