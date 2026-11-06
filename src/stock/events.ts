export const STOCK_UPDATED = 'stock:updated';
export const STOCK_WARNING = 'stock:warning';
export function publishStockChange(warnings: string[] = []) {
  window.dispatchEvent(new Event(STOCK_UPDATED));
  if (warnings.length) window.dispatchEvent(new CustomEvent(STOCK_WARNING, { detail: warnings }));
}
