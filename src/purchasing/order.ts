export interface PurchaseOrderLine {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}
export const purchaseLineTotal = (line: PurchaseOrderLine) =>
  Math.round(line.quantity * line.unitCost * 100) / 100;
export const purchaseOrderTotal = (lines: PurchaseOrderLine[]) =>
  lines.reduce(
    (cents, line) => cents + Math.round(purchaseLineTotal(line) * 100),
    0,
  ) / 100;
