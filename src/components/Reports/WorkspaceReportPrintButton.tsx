import { supplierColumns } from "../Suppliers/supplierColumns";
import printTable from "./printTable";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import { purchaseInvoice } from "../../purchasing/invoice";
import { useMemo } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardRange } from "../../dashboard/period";
import { dashboardMetrics } from "../../dashboard/metrics";
import PrintReportsController from "../../controllers/PrintReportsController";
import { PrintableSection } from "../../reports/types";
import PrintReportButton from "./PrintReportButton";
import Price from "../Items/Price";

export default function WorkspaceReportPrintButton({
  range,
  mode,
}: {
  range: DashboardRange | null;
  mode: "dashboard" | "overview";
}) {
  const t = useLocaleText();
  const { purchasing } = useClientGlobal();
  const stores = useDatabase();
  const controller = useMemo(
    () => new PrintReportsController(stores),
    [stores],
  );
  return (
    <PrintReportButton
      disabled={!range}
      createReport={async () => {
        if (!range) throw new Error();
        const {
          summary,
          transactions,
          supplierTransactions,
          supplierInsights,
        } = await controller.getReport(range, mode, purchasing);
        const status = (deletedAt?: number) =>
          deletedAt ? t("DELETED_BADGE") : "";
        const sections: PrintableSection[] = [];
        if (mode === "overview") {
          sections.push({
            title: t("DASH_OVERVIEW"),
            columns: [t("PRINT_METRIC"), t("PRINT_VALUE"), t("PRINT_NOTES")],
            rows: dashboardMetrics(summary, purchasing).map((metric) => [
              t(metric.label),
              "money" in metric ? (
                <Price price={metric.value} />
              ) : (
                metric.value.toLocaleString()
              ),
              "note" in metric ? t(metric.note) : "",
            ]),
          });
          sections.push({
            title: t("DASH_TREND"),
            columns: [
              t("DASH_PERIOD"),
              t("DASH_SALE_COUNT"),
              t("DASH_SALES"),
              t("DASH_PAYMENTS"),
              ...(purchasing
                ? [t("DASH_PURCHASES"), t("DASH_SUPPLIER_PAYMENTS")]
                : []),
            ],
            rows: summary.buckets.map((bucket) => [
              new Date(bucket.timestamp).toLocaleDateString(
                undefined,
                summary.monthly
                  ? { month: "long", year: "numeric" }
                  : undefined,
              ),
              bucket.salesCount,
              <Price price={bucket.sales} />,
              <Price price={bucket.payments} />,
              ...(purchasing
                ? [
                    <Price price={bucket.purchases} />,
                    <Price price={bucket.supplierPayments} />,
                  ]
                : []),
            ]),
          });
          if (supplierInsights) {
            sections.push({
              title: t("SUPPLIER_INSIGHTS"),
              columns: [t("PRINT_METRIC"), t("PRINT_VALUE"), t("PRINT_NOTES")],
              rows: [
                [t("SUPPLIER_ACTIVE"), supplierInsights.activeSuppliers, ""],
                [
                  t("SUPPLIER_AVERAGE_PURCHASE"),
                  <Price price={supplierInsights.averagePurchase} />,
                  "",
                ],
                [
                  t("SUPPLIER_TOTAL_OWED"),
                  <Price price={supplierInsights.owed} />,
                  t("SUPPLIER_ALL_TIME"),
                ],
                [
                  t("SUPPLIER_CREDIT"),
                  <Price price={supplierInsights.credit} />,
                  t("SUPPLIER_ALL_TIME"),
                ],
              ],
            });
            sections.push(
              printTable(
                t("SUPPLIER_TOP"),
                supplierInsights.topSuppliers,
                supplierColumns(t),
              ),
            );
            sections.push(
              printTable(
                t("SUPPLIER_BALANCES"),
                supplierInsights.balances,
                supplierColumns(t, true),
              ),
            );
          }
        } else {
          sections.push({
            title: t("REPORT_TRANSACTIONS"),
            columns: [
              t("PRINT_ID"),
              t("TRANSACTION_TABLE_HEADER_TIME"),
              t("PAYMENT_TYPE"),
              t("CONTACT_NAME"),
              t("PRINT_VALUE"),
              t("DASH_STATUS"),
            ],
            rows: transactions.map((row) => [
              row.id,
              new Date(row.timestamp).toLocaleString(),
              t(row.kind === "payment" ? "PAYMENT_TITLE" : "PAYMENT_SALE"),
              row.customers.map((contact) => contact.name).join(", ") ||
                t("TRANSACTION_NO_CUSTOMER"),
              <Price price={row.total} />,
              status(row.deletedAt),
            ]),
          });
          if (purchasing)
            sections.push({
              title: t("REPORT_SUPPLIER_TRANSACTIONS"),
              columns: [
                t("BUY_REFERENCE"),
                t("TRANSACTION_TABLE_HEADER_TIME"),
                t("PAYMENT_TYPE"),
                t("CONTACT_NAME"),
                t("PRINT_VALUE"),
                t("DASH_STATUS"),
              ],
              rows: supplierTransactions.map((row) => [
                row.kind === "purchase" ? purchaseInvoice(row) : row.reference,
                new Date(row.timestamp).toLocaleString(),
                t(row.kind === "purchase" ? "BUY_PURCHASE" : "BUY_PAYMENT"),
                row.contactName,
                <Price price={row.total} />,
                status(row.deletedAt),
              ]),
            });
        }
        sections.push({
          title: t("REPORT_ITEMS_SOLD"),
          columns: [
            t("UI_ITEM"),
            t("DASH_UNITS"),
            t("DASH_SALE_COUNT"),
            t("DASH_ITEM_VALUE"),
            t("DASH_STATUS"),
          ],
          rows: [...summary.topItems]
            .sort(
              (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
            )
            .map((row) => [
              row.name,
              row.quantity,
              row.salesCount,
              <Price price={row.gross} />,
              status(row.deletedAt),
            ]),
        });
        return {
          title: t(
            mode === "dashboard" ? "REPORT_DASHBOARD" : "REPORT_OVERVIEW",
          ),
          range,
          note: t("DASH_TOP_ITEMS_HELP"),
          sections,
        };
      }}
    />
  );
}
