import ProductOS, { ProductSchema } from "../database/ProductOS";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";
import ProductItem, {
  IProductItem,
  ProductItemParams,
} from "../models/ProductItem";

export interface IItemsController<S, I, OS> extends IController<S, I, OS> {
  handleFormSubmit: (data: IItemFormData) => Promise<I | null>;

  getAllItems: () => Promise<I[]>;

  deleteItem: (item: I) => Promise<I | null>;

  getAllAsJSONString: () => Promise<string>;

  addManyFromJSON: (json: string) => Promise<I[]>;
}

export interface IItemFormData {
  name: string;
  price: number;
}

export default class ItemsController
  extends Controller<ProductSchema, ProductItem, ProductOS>
  implements IItemsController<ProductSchema, ProductItem, ProductOS>
{
  private items: ProductItem[];

  constructor(itemOS: ProductOS) {
    super(itemOS);

    this.items = [];
  }

  public async handleFormSubmit({ name, price }: IItemFormData) {
    if (name === "" || price == 0) return null;
    const item = new ProductItem({
      id: uuidv4(),
      name,
      amount: price,
    } as ProductItemParams);
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

  public async deleteItem(item: IProductItem) {
    const deleted = await this.deleteOne(item.getId());
    if (deleted) {
      return deleted;
    }
    return null;
  }

  public async getAllAsJSONString() {
    return this.objectStore.getAllAsJSONString();
  }

  public addManyFromJSON(json: string) {
    return this.objectStore.addManyFromJSON(json);
  }
}
