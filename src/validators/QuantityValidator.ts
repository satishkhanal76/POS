import { getLocaleText } from "../localization/locale";
export const MAX_QUANTITY = Number.MAX_SAFE_INTEGER / 1000;
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;
export function validQuantity(value: number, allowZero = false) {
  return (
    Number.isFinite(value) &&
    (allowZero ? value >= 0 : value > 0) &&
    value <= MAX_QUANTITY &&
    Math.abs(value * 1000 - Math.round(value * 1000)) < 0.0001
  );
}
export function parseQuantity(value: string) {
  const quantity = value.trim() ? Number(value) : NaN;
  if (!validQuantity(quantity))
    throw new Error(getLocaleText("QUANTITY_INVALID"));
  return roundQuantity(quantity);
}
