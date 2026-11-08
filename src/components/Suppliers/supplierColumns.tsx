import { Translate } from "../../contexts/Locale";
import { SupplierInsight } from "../../controllers/SupplierInsightsController";
import Price from "../Items/Price";
import { CustomTableColumn } from "../utils/CustomTableView";

/** Keep overview tables and exported reports on the same column definitions. */
export function supplierColumns(
  t: Translate,
  balances = false,
): CustomTableColumn<SupplierInsight>[] {
  return [
    { key: "name", header: t("CONTACT_NAME"), render: (row) => row.name },
    ...(!balances
      ? [
          {
            key: "count",
            header: t("DASH_PURCHASE_COUNT"),
            variant: "numeric" as const,
            render: (row: SupplierInsight) => row.purchaseCount,
          },
        ]
      : []),
    {
      key: "purchases",
      header: t("DASH_PURCHASES"),
      variant: "numeric",
      render: (row) => (
        <Price price={balances ? row.lifetimePurchases : row.purchases} />
      ),
    },
    {
      key: "payments",
      header: t("DASH_SUPPLIER_PAYMENTS"),
      variant: "numeric",
      render: (row) => (
        <Price price={balances ? row.lifetimePayments : row.payments} />
      ),
    },
    balances
      ? {
          key: "balance",
          header: t("SUPPLIER_BALANCE"),
          variant: "numeric",
          render: (row) => <Price price={row.balance} />,
        }
      : {
          key: "average",
          header: t("SUPPLIER_AVERAGE_PURCHASE"),
          variant: "numeric",
          render: (row) =>
            row.purchaseCount ? <Price price={row.averagePurchase} /> : "—",
        },
  ];
}
