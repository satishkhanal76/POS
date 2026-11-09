import { DashboardSummary } from "../controllers/DashboardController";
/** Shared metric definitions keep on-screen and printed summaries aligned. */
export function dashboardMetrics(
  data: DashboardSummary,
  purchasing = false,
  sales = true,
) {
  return [
    ...(sales
      ? ([
          {
            label: "DASH_SALES",
            value: data.sales,
            money: true,
            note: "DASH_SALES_HELP",
          },
          { label: "DASH_SALE_COUNT", value: data.salesCount },
          {
            label: "DASH_PAYMENTS",
            value: data.payments,
            money: true,
            note: "DASH_PAYMENTS_HELP",
          },
          {
            label: "DASH_CUSTOMERS",
            value: data.customers,
            note: "DASH_CUSTOMERS_HELP",
          },
          { label: "DASH_AVERAGE", value: data.averageSale, money: true },
          { label: "DASH_UNITS", value: data.units },
          { label: "DASH_PAYMENT_COUNT", value: data.paymentCount },
          { label: "DASH_UNLINKED", value: data.unlinkedSales },
          {
            label: "DASH_MOVEMENT",
            value: data.balanceMovement,
            money: true,
            note: "DASH_MOVEMENT_HELP",
          },
        ] as const)
      : []),
    ...(purchasing
      ? ([
          { label: "DASH_PURCHASES", value: data.purchases, money: true },
          { label: "DASH_PURCHASE_COUNT", value: data.purchaseCount },
          {
            label: "DASH_SUPPLIER_PAYMENTS",
            value: data.supplierPayments,
            money: true,
          },
          {
            label: "DASH_SUPPLIER_PAYMENT_COUNT",
            value: data.supplierPaymentCount,
          },
          {
            label: "DASH_SUPPLIER_MOVEMENT",
            value: data.supplierBalanceMovement,
            money: true,
            note: "DASH_SUPPLIER_MOVEMENT_HELP",
          },
        ] as const)
      : []),
  ] as const;
}
