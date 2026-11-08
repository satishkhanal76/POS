import { useClientGlobal } from "../../contexts/ClientGlobal";
import ReportTable from "./ReportTable";
import CollapsibleReport from "../utils/CollapsibleReport";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardSummary } from "../../controllers/DashboardController";
import Price from "../Items/Price";
import { CustomTableColumn } from "../utils/CustomTableView";

export default function DashboardTrend({ data }: { data: DashboardSummary }) {
  const t = useLocaleText();
  const { purchasing } = useClientGlobal();
  const columns: CustomTableColumn<DashboardSummary["buckets"][number]>[] = [
    {
      key: "period",
      header: t("DASH_PERIOD"),
      render: (row) =>
        new Date(row.timestamp).toLocaleDateString(
          undefined,
          data?.monthly
            ? { month: "short", year: "numeric" }
            : { day: "numeric", month: "short", year: "numeric" },
        ),
    },
    {
      key: "count",
      header: t("DASH_SALE_COUNT"),
      variant: "numeric",
      render: (row) => row.salesCount,
    },
    {
      key: "sales",
      header: t("DASH_SALES"),
      variant: "numeric",
      render: (row) => <Price price={row.sales} />,
    },
    {
      key: "payments",
      header: t("DASH_PAYMENTS"),
      variant: "numeric",
      render: (row) => <Price price={row.payments} />,
    },
  ];
  if (purchasing)
    columns.push(
      {
        key: "purchases",
        header: t("DASH_PURCHASES"),
        variant: "numeric",
        render: (row) => <Price price={row.purchases} />,
      },
      {
        key: "supplierPayments",
        header: t("DASH_SUPPLIER_PAYMENTS"),
        variant: "numeric",
        render: (row) => <Price price={row.supplierPayments} />,
      },
    );
  const max = data
    ? data.buckets.reduce(
        (maximum, bucket) =>
          Math.max(
            maximum,
            Math.abs(bucket.sales),
            bucket.payments,
            ...(purchasing ? [bucket.purchases, bucket.supplierPayments] : []),
          ),
        1,
      )
    : 1;
  return (
    <section className="dashboard-panel">
      <h2>{t("DASH_TREND")}</h2>
      <p className="dashboard-note">{t("DASH_TREND_HELP")}</p>
      <div className="dashboard-legend" aria-hidden="true">
        <span>{t("DASH_SALES")}</span>
        <span>{t("DASH_PAYMENTS")}</span>
        {purchasing && (
          <>
            <span className="supplier-purchases">{t("DASH_PURCHASES")}</span>
            <span className="supplier-payments">
              {t("DASH_SUPPLIER_PAYMENTS")}
            </span>
          </>
        )}
      </div>
      <div className="dashboard-chart" aria-hidden="true">
        {data.buckets.map((bucket) => (
          <div
            className="dashboard-chart-column"
            key={bucket.key}
            title={bucket.key}
          >
            <div className="dashboard-bars">
              <i
                style={{ height: `${(Math.abs(bucket.sales) / max) * 100}%` }}
              />
              <i style={{ height: `${(bucket.payments / max) * 100}%` }} />
              {purchasing && (
                <>
                  <i
                    className="supplier-purchases"
                    style={{ height: `${(bucket.purchases / max) * 100}%` }}
                  />
                  <i
                    className="supplier-payments"
                    style={{
                      height: `${(bucket.supplierPayments / max) * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
            <span>
              {new Date(bucket.timestamp).toLocaleDateString(
                undefined,
                data.monthly
                  ? { month: "short", year: "2-digit" }
                  : { day: "numeric", month: "short" },
              )}
            </span>
          </div>
        ))}
      </div>
      <CollapsibleReport title={t("DASH_BREAKDOWN")} nested>
        <ReportTable
          label={t("DASH_BREAKDOWN")}
          rows={[...data.buckets].reverse()}
          columns={columns}
          rowKey={(row) => row.key}
        />
      </CollapsibleReport>
    </section>
  );
}
