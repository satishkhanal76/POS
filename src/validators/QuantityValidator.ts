import { getLocaleText } from '../localization/locale';

export function parseQuantity(value: string): number {
  const quantity = value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(getLocaleText('QUANTITY_INVALID'));
  return quantity;
}
