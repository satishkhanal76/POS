import Item, { IItem, ItemParams } from "./Item";

export interface IProductItem extends IItem {
  canSell?: number;
  canPurchase?: number;
}

export interface ProductItemParams extends ItemParams {
  canSell?: number;
  canPurchase?: number;
}

export default class ProductItem extends Item implements IProductItem {
  public canSell: number;
  public canPurchase: number;
  private readonly originalAmount: number;

  constructor(
    productItemSchema: ProductItemParams,
    originalAmount = productItemSchema.amount,
  ) {
    super(productItemSchema as ItemParams);
    this.canSell = productItemSchema.canSell ?? 1;
    this.canPurchase = productItemSchema.canPurchase ?? 1;
    this.originalAmount = originalAmount;
  }
  public getOriginalAmount() {
    return this.originalAmount;
  }
}
