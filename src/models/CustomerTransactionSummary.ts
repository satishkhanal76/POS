import { ICustomer } from './Customer';

export interface CustomerSummarySchema {
  id: string;
  timestamp: number;
  count: number;
  total: number;
}
export default class CustomerTransactionSummary {
  constructor(public readonly data: CustomerSummarySchema, public readonly customer: ICustomer) {}
}
