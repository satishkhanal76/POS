import PurchasingOS from "../database/PurchasingOS";
import { PurchaseInput } from "../models/Purchase";
import { PageOptions } from "../database/Pagination";
import { DashboardRange } from "../dashboard/period";
export default class PurchasingController {
  constructor(private readonly store: PurchasingOS) {}
  receive(input: PurchaseInput) {
    return this.store.receive(input);
  }
  pay(contactId: string, amount: number, timestamp: number, reference: string) {
    return this.store.pay(contactId, amount, timestamp, reference);
  }
  getPurchasePayments(
    contactId: string,
    reference: string,
    options: PageOptions,
  ) {
    return this.store.getPurchasePayments(contactId, reference, options);
  }
  getPage(
    options: PageOptions,
    range: DashboardRange,
    contactId?: string,
    kind?: string,
  ) {
    return this.store.getPage(options, range, contactId, kind);
  }
}
