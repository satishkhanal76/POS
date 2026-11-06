/** One current count per product. Missing records mean zero, not unlimited stock. */
export interface StockSchema {
  id: string;
  count: number;
}
