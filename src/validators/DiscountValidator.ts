import { DiscountItemType } from '../models/DiscountItem';
import { getLocaleText } from '../localization/locale';

/** Percentages apply to the product subtotal, matching Transaction's calculation. */
export function getDiscountAmount(type: DiscountItemType, value: number, subtotal: number, remaining: number): number {
  if (type !== DiscountItemType.FLAT && type !== DiscountItemType.PERCENTAGE) throw new Error(getLocaleText('DISCOUNT_TYPE_INVALID'));
  if (!Number.isFinite(value) || value <= 0) throw new Error(getLocaleText('DISCOUNT_POSITIVE_REQUIRED'));
  if (type === DiscountItemType.PERCENTAGE && value > 100) throw new Error(getLocaleText('DISCOUNT_PERCENTAGE_RANGE'));
  const amount = type === DiscountItemType.PERCENTAGE ? subtotal * value / 100 : value;
  if (!Number.isFinite(amount) || amount - remaining > 0.0000001) throw new Error(getLocaleText('DISCOUNT_EXCEEDS_TOTAL'));
  return amount;
}
