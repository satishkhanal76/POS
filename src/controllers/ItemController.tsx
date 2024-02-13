import ItemOS, { ItemSchema } from "../database/ItemOS";
import { IItem, Item } from "../model/Item";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";

export interface IItemController<S, I, OS> extends IController<S, I, OS> {
  handleFormSubmit: (data: S) => Promise<I | null>;

  getAllItems: () => Promise<I[]>;

  deleteItem: (item: I) => Promise<I | null>;
}

export interface IItemFormData {
  name: string;
  price: number;
}

export default class ItemController
  extends Controller<ItemSchema, IItem, ItemOS>
  implements IItemController<ItemSchema, IItem, ItemOS>
{
  constructor(itemOS: ItemOS) {
    super(itemOS);
  }

  public async handleFormSubmit({ name, price }: IItemFormData) {
    if (name === "" || price == 0) return null;
    const item: IItem = new Item({ id: uuidv4(), name, price } as ItemSchema);

    //validate here

    return this.addOne(item);
  }

  public async getAllItems() {
    const itemsFromDB: ItemSchema[] = await this.getAll();
    const items: IItem[] = itemsFromDB.map((item) => new Item(item));
    return items;
  }

  public async deleteItem(item: IItem) {
    const deleted = await this.deleteOne(item.getId());
    if (deleted) {
      return item;
    }
    return null;
  }
}
