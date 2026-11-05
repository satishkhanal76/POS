import Item, { IItem, ItemParams } from "./Item";

export interface IProductItem extends IItem {}

export interface ProductItemParams extends ItemParams {}

export default class ProductItem extends Item implements IProductItem {
  private readonly originalAmount: number;

  constructor(productItemSchema: ProductItemParams, originalAmount = productItemSchema.amount) {
    super(productItemSchema as ItemParams);
    this.originalAmount = originalAmount;
  }
  public getOriginalAmount() { return this.originalAmount; }
}
