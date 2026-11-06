import DashboardOS, { DashboardEntry } from '../database/DashboardOS';
import { DashboardRange, dateInput } from '../dashboard/period';

export default class DashboardController {
  constructor(private readonly store: DashboardOS) {}
  async getSummary(range: DashboardRange) {
    return this.summarize(await this.store.getEntries(range), range);
  }
  public summarize(entries: DashboardEntry[], range: DashboardRange) {
    const first = entries[0]?.timestamp ?? Date.now();
    const last = entries[entries.length - 1]?.timestamp ?? first;
    const bucketRange = range.all ? { start: first, end: last + 1 } : range;
    const monthly = bucketRange.end - bucketRange.start > 62 * 86400000;
    const keyFor = (date: Date) => monthly ? dateInput(date).slice(0, 7) : dateInput(date);
    const buckets = new Map<string, { key: string; timestamp: number; sales: number; salesCount: number; payments: number }>();
    const cursor = new Date(bucketRange.start);
    cursor.setHours(0, 0, 0, 0);
    if (monthly) cursor.setDate(1);
    while (cursor.getTime() < bucketRange.end) {
      const key = keyFor(cursor);
      buckets.set(key, { key, timestamp: cursor.getTime(), sales: 0, salesCount: 0, payments: 0 });
      if (monthly) cursor.setMonth(cursor.getMonth() + 1); else cursor.setDate(cursor.getDate() + 1);
    }
    let salesCount = 0, sales = 0, paymentCount = 0, payments = 0, linkedSales = 0, linkedPayments = 0, unlinkedSales = 0, units = 0;
    const customers = new Set<string>();
    const handled = new Map<string, { id: string; name: string; phoneNumber: string; deletedAt?: number; sales: number; salesCount: number; payments: number; paymentCount: number }>();
    const items = new Map<string, { id: string; name: string; quantity: number; gross: number; deletedAt?: number; salesCount: number }>();
    for (const entry of entries) {
      entry.customers.forEach(customer => customers.add(customer.id));
      for (const customer of entry.customers) {
        const row = handled.get(customer.id) ?? { ...customer, sales: 0, salesCount: 0, payments: 0, paymentCount: 0 };
        if (entry.kind === 'payment') { row.payments -= entry.total; row.paymentCount++; }
        else { row.sales += entry.total; row.salesCount++; }
        handled.set(row.id, row);
      }
      const bucket = buckets.get(keyFor(new Date(entry.timestamp)))!;
      if (entry.kind === 'payment') { paymentCount++; payments -= entry.total; bucket.payments -= entry.total; if (entry.customerIds.length) linkedPayments -= entry.total; }
      else {
        salesCount++; sales += entry.total; units += entry.units;
        const counted = new Set<string>();
        for (const product of entry.products) {
          const item = items.get(product.id) || { id: product.id, name: product.name, deletedAt: product.deletedAt, quantity: 0, gross: 0, salesCount: 0 };
          item.quantity += product.quantity; item.gross += product.gross;
          if (!counted.has(product.id)) item.salesCount++;
          counted.add(product.id); items.set(item.id, item);
        }
        bucket.sales += entry.total; bucket.salesCount++;
        if (entry.customerIds.length) linkedSales += entry.total; else unlinkedSales++;
      }
    }
    return { salesCount, sales, paymentCount, payments, customers: customers.size, units, unlinkedSales,
      averageSale: salesCount ? sales / salesCount : 0, balanceMovement: linkedSales - linkedPayments,
      handledCustomers: [...handled.values()].sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name)),
      topItems: [...items.values()], monthly, buckets: [...buckets.values()] };
  }
}
export type DashboardSummary = Awaited<ReturnType<DashboardController['getSummary']>>;
