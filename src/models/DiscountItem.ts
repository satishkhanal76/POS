import Item, { IItem, ItemParams } from "./Item";

export enum DiscountItemType {
  FLAT,
  PERCENTAGE,
}

export interface IDiscountItem extends IItem {
  getDiscountType: () => DiscountItemType;
}

export interface DiscountItemParams extends ItemParams {
  discountType: DiscountItemType;
}

export default class DiscountItem extends Item implements IDiscountItem {
  private discountType: DiscountItemType;

  constructor(discountItemSchema: DiscountItemParams) {
    super(discountItemSchema as ItemParams);
    this.discountType =
      discountItemSchema.discountType || DiscountItemType.FLAT;
  }

  public getDiscountType(): DiscountItemType {
    return this.discountType;
  }
}
