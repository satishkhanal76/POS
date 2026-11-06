import { DashboardSummary } from '../controllers/DashboardController';
/** Shared metric definitions keep on-screen and printed summaries aligned. */
export function dashboardMetrics(data: DashboardSummary) {
  return [
    { label: 'DASH_SALES', value: data.sales, money: true, note: 'DASH_SALES_HELP' },
    { label: 'DASH_SALE_COUNT', value: data.salesCount },
    { label: 'DASH_PAYMENTS', value: data.payments, money: true, note: 'DASH_PAYMENTS_HELP' },
    { label: 'DASH_CUSTOMERS', value: data.customers, note: 'DASH_CUSTOMERS_HELP' },
    { label: 'DASH_AVERAGE', value: data.averageSale, money: true },
    { label: 'DASH_UNITS', value: data.units },
    { label: 'DASH_PAYMENT_COUNT', value: data.paymentCount },
    { label: 'DASH_UNLINKED', value: data.unlinkedSales },
    { label: 'DASH_MOVEMENT', value: data.balanceMovement, money: true, note: 'DASH_MOVEMENT_HELP' },
  ] as const;
}
