import useListFilter from "../../hooks/useListFilter";
import Select from "../Forms/Select";
import { purchaseInvoice } from "../../purchasing/invoice";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import useReportPeriod from "../../hooks/useReportPeriod";
import usePagedQuery from "../../hooks/usePagedQuery";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import { PageOptions } from "../../database/Pagination";
import { PurchasingRow } from "../../database/PurchasingOS";
import PurchasingController from "../../controllers/PurchasingController";
import DashboardFilters from "../Dashboard/DashboardFilters";
import PaginationControls from "../utils/PaginationControls";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import DeleteRecordButton from "../utils/DeleteRecordButton";
import Price from "../Items/Price";
import PrintReportButton from "../Reports/PrintReportButton";
import ReportToolbar from "../Reports/ReportToolbar";
import printTable from "../Reports/printTable";
export default function PurchasingHistory({
  contactId,
}: {
  contactId?: string;
}) {
  const t = useLocaleText(),
    stores = useDatabase(),
    period = useReportPeriod("all"),
    revision = useDeletionRevision(),
    navigate = useNavigate(),
    location = useLocation();
  const controller = useMemo(
    () => new PurchasingController(stores.purchasingOS),
    [stores.purchasingOS],
  );
  const [requestedKind, setKind] = useListFilter("purchasing-kind");
  const selectedKind = ["purchase", "supplier-payment"].includes(requestedKind)
    ? requestedKind
    : "all";
  const query = useCallback(
    (options: PageOptions) => {
      void revision;
      return period.range
        ? controller.getPage(
            { ...options, includeDeleted: period.range.includeDeleted },
            period.range,
            contactId,
            selectedKind,
          )
        : Promise.reject(new Error());
    },
    [controller, period.range, contactId, selectedKind, revision],
  );
  const pagination = usePagedQuery(query, "purchasing");
  const columns: CustomTableColumn<PurchasingRow>[] = [
    {
      key: "date",
      header: t("TRANSACTION_TABLE_HEADER_TIME"),
      render: (row) => new Date(row.timestamp).toLocaleDateString(),
    },
    {
      key: "contact",
      header: t("CONTACT_NAME"),
      render: (row) => row.contactName,
    },
    {
      key: "kind",
      header: t("PAYMENT_TYPE"),
      render: (row) =>
        t(row.kind === "purchase" ? "BUY_PURCHASE" : "BUY_PAYMENT"),
    },
    {
      key: "reference",
      header: t("BUY_REFERENCE"),
      render: (row) =>
        row.kind === "purchase" ? purchaseInvoice(row) : row.reference,
    },
    {
      key: "total",
      header: t("PRINT_VALUE"),
      variant: "numeric",
      render: (row) => <Price price={row.total} />,
    },
    {
      key: "actions",
      header: t("UI_ACTIONS"),
      variant: "actions",
      render: (row) => (
        <DeleteRecordButton
          table={row.kind === "purchase" ? "PURCHASES" : "SUPPLIER_PAYMENTS"}
          id={row.id}
          name={
            row.kind === "purchase"
              ? purchaseInvoice(row)
              : row.reference || t("BUY_PAYMENT")
          }
          deleted={!!row.deletedAt}
        />
      ),
    },
  ];
  return (
    <>
      <DashboardFilters {...period} />
      {!period.range ? (
        <p role="alert">{t("DASH_INVALID")}</p>
      ) : (
        <>
          <ReportToolbar
            actions={
              <PrintReportButton
                createReport={async () => {
                  const result = await query({
                    page: 1,
                    pageSize: 0,
                    sort: pagination.sort,
                  });
                  return {
                    title: t("BUY_HISTORY"),
                    range: period.range,
                    sections: [
                      printTable(t("BUY_HISTORY"), result.rows, columns),
                    ],
                  };
                }}
              />
            }
          >
            <PaginationControls
              filters={
                <label className="pagination-field">
                  {t("FILTER_TYPE")}
                  <Select value={selectedKind} onChange={setKind}>
                    <option value="all">{t("FILTER_ALL_TYPES")}</option>
                    <option value="purchase">{t("BUY_PURCHASE")}</option>
                    <option value="supplier-payment">
                      {t("BUY_PAYMENTS")}
                    </option>
                  </Select>
                </label>
              }
              extraSorts
              itemSorts={false}
              page={pagination.page}
              pageSize={pagination.pageSize}
              sort={pagination.sort}
              total={pagination.result?.total ?? 0}
              busy={pagination.loading}
              onChange={pagination.change}
            />
          </ReportToolbar>
          {pagination.loading ? (
            <p role="status">{t("PAGINATION_LOADING")}</p>
          ) : pagination.error ? (
            <p role="alert">{t("PAGINATION_ERROR")}</p>
          ) : (
            <CustomTableView
              label={t("BUY_HISTORY")}
              data={pagination.result?.rows ?? []}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                navigate(
                  `/purchase?id=${encodeURIComponent(row.id)}&kind=${row.kind}${period.range?.includeDeleted ? "&deleted=1" : ""}`,
                  { state: { returnTo: location.pathname + location.search } },
                )
              }
            />
          )}
        </>
      )}
    </>
  );
}
