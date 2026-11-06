import { getLocaleText } from "../contexts/Locale";
import ProductOS, { ProductSchema } from "../database/ProductOS";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";
import ProductItem, {
  IProductItem,
  ProductItemParams,
} from "../models/ProductItem";
import CustomSet from "../Data-Structures/UniqueSet";

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
  canSell?: boolean;
  canPurchase?: boolean;
}

export default class ItemsController
  extends Controller<ProductSchema, ProductItem, ProductOS>
  implements IItemsController<ProductSchema, ProductItem, ProductOS>
{
  private items: CustomSet<ProductItem>;

  constructor(itemOS: ProductOS) {
    super(itemOS);

    this.items = new CustomSet<ProductItem>();
  }

  public async handleFormSubmit({
    name,
    price,
    canSell = true,
    canPurchase = true,
  }: IItemFormData) {
    if (
      !name.trim() ||
      (!canSell && !canPurchase) ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    )
      throw new Error(getLocaleText("BUY_INVALID"));
    const item = new ProductItem({
      id: uuidv4(),
      name,
      amount: Number(price),
      canSell: canSell ? 1 : 0,
      canPurchase: canPurchase ? 1 : 0,
    } as ProductItemParams);
    this.items.add(item);
    return this.addOne(item);
  }

  public async getAllItems() {
    return this.getAll();
  }

  public async updateItem(
    id: string,
    name: string,
    price: number,
    eligibility?: { canSell: number; canPurchase: number },
  ): Promise<void> {
    if (!name.trim()) throw new Error(getLocaleText("UI_ENTER_AN_ITEM_NAME"));
    if (!Number.isFinite(price) || price < 0)
      throw new Error(getLocaleText("UI_ENTER_A_VALID_PRICE_OF_ZERO_OR_MORE"));
    await this.objectStore.updateDetails(id, name.trim(), price, eligibility);
  }

  public async deleteItem(item: IProductItem) {
    const deleted = await this.deleteOne(item.getId());

    if (deleted) {
      this.items.delete(deleted);
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
