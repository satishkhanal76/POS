import { v4 as uuidv4 } from "uuid";
import DiscountOS from "../database/DiscountOS";
import DiscountItem, { DiscountItemType } from "../models/DiscountItem";
import { ITransaction } from "../models/Transaction";
import { getLocaleText } from "../localization/locale";
import { getDiscountAmount } from "../validators/DiscountValidator";

export interface DiscountFormData {
  type: DiscountItemType;
  value: number;
}
export default class DiscountController {
  constructor(private readonly discounts: DiscountOS) {}

  public async apply(
    transaction: ITransaction,
    { type, value }: DiscountFormData,
  ) {
    if (transaction.isPosted() || !transaction.hasItems())
      throw new Error(getLocaleText("DISCOUNT_UNAVAILABLE"));
    const subtotal = transaction
      .getAllTransactionProductItems()
      .reduce((sum, item) => sum + item.getAmount(), 0);
    getDiscountAmount(type, value, subtotal, transaction.getTotal());
    const discount = new DiscountItem({
      id: uuidv4(),
      name:
        type === DiscountItemType.PERCENTAGE
          ? getLocaleText("DISCOUNT_NAME_PERCENTAGE", { percentage: value })
          : getLocaleText("DISCOUNT_NAME_FLAT"),
      amount: value,
      discountType: type,
    });
    // Wait for persistence; a failed write must not add a phantom discount to the order.
    await this.discounts.addOne(discount);
    return transaction.addDiscountItem(discount);
  }
}
