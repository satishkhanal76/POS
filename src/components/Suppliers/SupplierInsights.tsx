import type { BalanceFilter } from "../../database/CustomerBalancesOS";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardRange } from "../../dashboard/period";
import { SupplierInsight } from "../../controllers/SupplierInsightsController";
import useSupplierInsights from "../../hooks/useSupplierInsights";
import { ReportPrintContext } from "../../reports/ReportPrintContext";
import Price from "../Items/Price";
import Select from "../Forms/Select";
import ReportTable from "../Dashboard/ReportTable";
import CollapsibleReport from "../utils/CollapsibleReport";
import { supplierColumns } from "./supplierColumns";

const allTime = { start: 0, end: Number.MAX_SAFE_INTEGER, all: true };

export default function SupplierInsights({
  range,
  refresh,
  periodParams,
  defaultFilter = "owing",
}: {
  range: DashboardRange;
  refresh: number;
  periodParams: URLSearchParams;
  defaultFilter?: BalanceFilter;
}) {
  const t = useLocaleText();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, busy, error } = useSupplierInsights(range, refresh);
  const [filter, setFilter] = useState<string>(defaultFilter);
  const openContact = (row: SupplierInsight, lifetime = false) => {
    const params = lifetime
      ? new URLSearchParams({ period: "all" })
      : new URLSearchParams(periodParams);
    params.set("id", row.id);
    if (range.includeDeleted) params.set("deleted", "1");
    navigate(`/contact?${params}#purchases`, {
      state: { returnTo: location.pathname + location.search },
    });
  };
  return (
    <section
      className="supplier-insights"
      aria-labelledby="supplier-insights-title"
    >
      <h2 id="supplier-insights-title">{t("SUPPLIER_INSIGHTS")}</h2>
      <p className="dashboard-note">{t("SUPPLIER_INSIGHTS_HELP")}</p>
      {busy ? (
        <p role="status">{t("DASH_LOADING")}</p>
      ) : error ? (
        <p role="alert">{t("DASH_ERROR")}</p>
      ) : (
        data && (
          <>
            <div className="dashboard-metrics">
              <article className="dashboard-metric">
                <h3>{t("SUPPLIER_ACTIVE")}</h3>
                <div className="dashboard-value">{data.activeSuppliers}</div>
              </article>
              <article className="dashboard-metric">
                <h3>{t("SUPPLIER_AVERAGE_PURCHASE")}</h3>
                <div className="dashboard-value">
                  <Price price={data.averagePurchase} />
                </div>
              </article>
              <article className="dashboard-metric">
                <h3>{t("SUPPLIER_TOTAL_OWED")}</h3>
                <div className="dashboard-value">
                  <Price price={data.owed} />
                </div>
                <p>{t("SUPPLIER_ALL_TIME")}</p>
              </article>
              <article className="dashboard-metric">
                <h3>{t("SUPPLIER_CREDIT")}</h3>
                <div className="dashboard-value">
                  <Price price={data.credit} />
                </div>
                <p>{t("SUPPLIER_ALL_TIME")}</p>
              </article>
            </div>
            <CollapsibleReport title={t("SUPPLIER_TOP")}>
              <p className="dashboard-note">{t("SUPPLIER_TOP_HELP")}</p>
              <ReportTable
                key={`${range.start}:${range.end}:${range.all}:${range.includeDeleted}`}
                rows={data.topSuppliers}
                columns={supplierColumns(t)}
                label={t("SUPPLIER_TOP")}
                rowKey={(row) => row.id}
                onRowClick={(row) => openContact(row)}
              />
            </CollapsibleReport>
            <CollapsibleReport title={t("SUPPLIER_BALANCES")}>
              <p className="dashboard-note">{t("SUPPLIER_BALANCES_HELP")}</p>
              <div className="dashboard-filters">
                <label>
                  {t("SUPPLIER_FILTER")}
                  <Select value={filter} onChange={setFilter}>
                    <option value="owing">{t("SUPPLIER_FILTER_OWING")}</option>
                    <option value="credit">
                      {t("SUPPLIER_FILTER_CREDIT")}
                    </option>
                    <option value="settled">
                      {t("SUPPLIER_FILTER_SETTLED")}
                    </option>
                    <option value="all">{t("REPORT_ALL")}</option>
                  </Select>
                </label>
              </div>
              <ReportPrintContext.Provider
                value={{ ...allTime, includeDeleted: range.includeDeleted }}
              >
                <ReportTable
                  key={filter}
                  rows={data.balances.filter(
                    (row) =>
                      filter === "all" ||
                      (filter === "owing"
                        ? row.balance > 0
                        : filter === "credit"
                          ? row.balance < 0
                          : row.balance === 0),
                  )}
                  columns={supplierColumns(t, true)}
                  label={t("SUPPLIER_BALANCES")}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => openContact(row, true)}
                />
              </ReportPrintContext.Provider>
            </CollapsibleReport>
          </>
        )
      )}
    </section>
  );
}
