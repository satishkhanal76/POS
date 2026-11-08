import { useClientGlobal } from "../../contexts/ClientGlobal";
import PurchasingHistory from "../Purchasing/PurchasingHistory";
import { ReportPrintContext } from "../../reports/ReportPrintContext";
import WorkspaceReportPrintButton from "../Reports/WorkspaceReportPrintButton";
import { useState } from "react";
import { Link } from "react-router-dom";
import useReportPeriod from "../../hooks/useReportPeriod";
import useDashboardSummary from "../../hooks/useDashboardSummary";
import { useLocaleText } from "../../contexts/Locale";
import PageHeader from "../Layout/PageHeader";
import DashboardFilters from "../Dashboard/DashboardFilters";
import CollapsibleReport from "../utils/CollapsibleReport";
import TransactionsView from "../Transactions/TransactionsView";
import TopSellingItems from "../Dashboard/TopSellingItems";
import "../../styles/Reports.css";

export default function DashboardPage() {
  const t = useLocaleText();
  const { purchasing } = useClientGlobal();
  const period = useReportPeriod("day");
  const [refresh, setRefresh] = useState(0);
  const { data, busy, error } = useDashboardSummary(period.range, refresh);
  const key = `${period.range?.start}:${period.range?.end}`;
  return (
    <ReportPrintContext.Provider value={period.range}>
      <main className="dashboard-page">
        <PageHeader
          title={t("REPORT_DASHBOARD")}
          description={t("REPORT_DASHBOARD_HELP")}
          actions={
            <>
              <WorkspaceReportPrintButton
                range={period.range}
                mode="dashboard"
              />
              <Link to={`/overview?${period.periodParams}`}>
                {t("REPORT_OVERVIEW")}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRefresh((value) => value + 1)}
              >
                {t("DASH_REFRESH")}
              </button>
            </>
          }
        />
        <DashboardFilters {...period} />
        {!period.range ? (
          <p role="alert">{t("DASH_INVALID")}</p>
        ) : (
          <>
            <CollapsibleReport title={t("REPORT_TRANSACTIONS")}>
              <TransactionsView
                range={period.range}
                scope="sales"
                refresh={refresh}
              />
            </CollapsibleReport>
            {purchasing && (
              <CollapsibleReport title={t("REPORT_SUPPLIER_TRANSACTIONS")}>
                <PurchasingHistory range={period.range} refresh={refresh} />
              </CollapsibleReport>
            )}
            {busy ? (
              <p role="status">{t("DASH_LOADING")}</p>
            ) : error ? (
              <p role="alert">{t("DASH_ERROR")}</p>
            ) : (
              data && (
                <>
                  <TopSellingItems
                    key={key}
                    items={data.topItems}
                    title="REPORT_ITEMS_SOLD"
                  />
                </>
              )
            )}
          </>
        )}
      </main>
    </ReportPrintContext.Provider>
  );
}
