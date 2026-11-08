import { SupplierActivityEntry } from "../database/SupplierActivityStore";
import DashboardOS, { DashboardEntry } from "../database/DashboardOS";
import { DashboardRange, dateInput } from "../dashboard/period";

export default class DashboardController {
  constructor(private readonly store: DashboardOS) {}
  async getSummary(range: DashboardRange, purchasing = true) {
    const [entries, suppliers] = await Promise.all([
      this.store.getEntries(range),
      purchasing ? this.store.getSupplierEntries(range) : Promise.resolve([]),
    ]);
    return this.summarize(entries, range, suppliers);
  }
  public summarize(
    entries: DashboardEntry[],
    range: DashboardRange,
    suppliers: SupplierActivityEntry[] = [],
  ) {
    let first = Infinity,
      last = -Infinity;
    for (const entry of entries) {
      first = Math.min(first, entry.timestamp);
      last = Math.max(last, entry.timestamp);
    }
    for (const entry of suppliers) {
      first = Math.min(first, entry.timestamp);
      last = Math.max(last, entry.timestamp);
    }
    const monthly =
      (range.all ? last - first : range.end - range.start) > 62 * 86400000;
    const keyFor = (date: Date) =>
      monthly ? dateInput(date).slice(0, 7) : dateInput(date);
    type Bucket = {
      key: string;
      timestamp: number;
      sales: number;
      salesCount: number;
      payments: number;
      purchases: number;
      purchaseCount: number;
      supplierPayments: number;
      supplierPaymentCount: number;
    };
    const buckets = new Map<string, Bucket>();
    // Create buckets from activity, including zero-value orders, rather than calendar gaps.
    const bucketFor = (timestamp: number) => {
      const date = new Date(timestamp);
      const key = keyFor(date);
      let bucket = buckets.get(key);
      if (!bucket) {
        date.setHours(0, 0, 0, 0);
        if (monthly) date.setDate(1);
        bucket = {
          key,
          timestamp: date.getTime(),
          sales: 0,
          salesCount: 0,
          payments: 0,
          purchases: 0,
          purchaseCount: 0,
          supplierPayments: 0,
          supplierPaymentCount: 0,
        };
        buckets.set(key, bucket);
      }
      return bucket;
    };
    let purchases = 0,
      purchaseCount = 0,
      supplierPayments = 0,
      supplierPaymentCount = 0;
    for (const entry of suppliers) {
      const bucket = bucketFor(entry.timestamp);
      if (entry.kind === "purchase") {
        purchases += entry.total;
        purchaseCount++;
        bucket.purchases += entry.total;
        bucket.purchaseCount++;
      } else {
        supplierPayments += entry.total;
        supplierPaymentCount++;
        bucket.supplierPayments += entry.total;
        bucket.supplierPaymentCount++;
      }
    }
    let salesCount = 0,
      sales = 0,
      paymentCount = 0,
      payments = 0,
      linkedSales = 0,
      linkedPayments = 0,
      unlinkedSales = 0,
      units = 0;
    const customers = new Set<string>();
    const handled = new Map<
      string,
      {
        id: string;
        name: string;
        phoneNumber: string;
        deletedAt?: number;
        sales: number;
        salesCount: number;
        payments: number;
        paymentCount: number;
      }
    >();
    const items = new Map<
      string,
      {
        id: string;
        name: string;
        quantity: number;
        gross: number;
        deletedAt?: number;
        salesCount: number;
      }
    >();
    for (const entry of entries) {
      const activeCustomers = entry.customers.filter(
        (customer) => range.includeDeleted || !customer.deletedAt,
      );
      activeCustomers.forEach((customer) => customers.add(customer.id));
      for (const customer of activeCustomers) {
        const row = handled.get(customer.id) ?? {
          ...customer,
          sales: 0,
          salesCount: 0,
          payments: 0,
          paymentCount: 0,
        };
        if (entry.kind === "payment") {
          row.payments -= entry.total;
          row.paymentCount++;
        } else {
          row.sales += entry.total;
          row.salesCount++;
        }
        handled.set(row.id, row);
      }
      const bucket = bucketFor(entry.timestamp);
      if (entry.kind === "payment") {
        paymentCount++;
        payments -= entry.total;
        bucket.payments -= entry.total;
        if (entry.customerIds.length) linkedPayments -= entry.total;
      } else {
        salesCount++;
        sales += entry.total;
        units += entry.units;
        const counted = new Set<string>();
        for (const product of entry.products) {
          const item = items.get(product.id) || {
            id: product.id,
            name: product.name,
            deletedAt: product.deletedAt,
            quantity: 0,
            gross: 0,
            salesCount: 0,
          };
          item.quantity += product.quantity;
          item.gross += product.gross;
          if (!counted.has(product.id)) item.salesCount++;
          counted.add(product.id);
          items.set(item.id, item);
        }
        bucket.sales += entry.total;
        bucket.salesCount++;
        if (entry.customerIds.length) linkedSales += entry.total;
        else unlinkedSales++;
      }
    }
    return {
      purchases,
      purchaseCount,
      supplierPayments,
      supplierPaymentCount,
      supplierBalanceMovement: purchases - supplierPayments,
      salesCount,
      sales,
      paymentCount,
      payments,
      customers: customers.size,
      units,
      unlinkedSales,
      averageSale: salesCount ? sales / salesCount : 0,
      balanceMovement: linkedSales - linkedPayments,
      handledCustomers: [...handled.values()].sort(
        (a, b) => b.sales - a.sales || a.name.localeCompare(b.name),
      ),
      topItems: [...items.values()],
      monthly,
      buckets: [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp),
    };
  }
}
export type DashboardSummary = Awaited<
  ReturnType<DashboardController["getSummary"]>
>;
