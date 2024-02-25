import DiscountItem, { DiscountItemType } from "./DiscountItem";
import TransactionItem, {
  ITransactionItem,
  TransactionItemParams,
} from "./TransactionItem";

export interface IDiscountTransactionItem
  extends ITransactionItem<DiscountItem> {
  /**
   * Sets the discount amount to the amount passed in
   * Only works if the discount type is percentage because if it is flat, the discount amount is already set
   * @param discountAmount the discount amount
   * @returns
   */
  setDiscountAmount: (discountAmount: number) => void;
}

export interface DiscountTransactionItemParams
  extends TransactionItemParams<DiscountItem> {}

export default class DiscountTransactionItem
  extends TransactionItem<DiscountItem>
  implements IDiscountTransactionItem
{
  private discountAmount: number;
  constructor(productTransItemSchema: DiscountTransactionItemParams) {
    super(productTransItemSchema);

    this.discountAmount =
      this.item.getDiscountType() === DiscountItemType.FLAT
        ? this.item.getAmount()
        : 0;
  }

  public setDiscountAmount(discountAmount: number): void {
    if (this.item.getDiscountType() === DiscountItemType.FLAT) return;
    this.discountAmount = discountAmount;
  }

  public getAmount(): number {
    return this.discountAmount * this.quantity;
  }
}
