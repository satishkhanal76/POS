import Item, { IItem, ItemParams } from "./Item";

export interface IProductItem extends IItem {}

export interface ProductItemParams extends ItemParams {}

export default class ProductItem extends Item implements IProductItem {
  constructor(productItemSchema: ProductItemParams) {
    super(productItemSchema as ItemParams);
  }
}
