export interface PurchaseSchema {
  id: string;
  contactId: string;
  contactName: string;
  timestamp: number;
  reference: string;
  total: number;
  stockApplied: number;
  deletedAt?: number;
  stockReversed?: number;
}
export interface PurchaseLineSchema {
  id: string;
  purchaseId: string;
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
}
export interface SupplierPaymentSchema {
  id: string;
  contactId: string;
  contactName: string;
  timestamp: number;
  reference: string;
  amount: number;
  deletedAt?: number;
}
export interface PurchaseInput {
  contactId: string;
  timestamp: number;
  reference: string;
  lines: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
}
