import TransactionContactFilter from "./TransactionContactFilter";
import useListFilter from "../../hooks/useListFilter";
import Select from "../Forms/Select";
import ReportToolbar from "../Reports/ReportToolbar";
import PrintReportButton from "../Reports/PrintReportButton";
import printTable from "../Reports/printTable";
import DeleteRecordButton from "../utils/DeleteRecordButton";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocale, useLocaleText } from "../../contexts/Locale";
import { useDatabase } from "../../contexts/DatabaseContext";
import TransactionHistoryController from "../../controllers/TransactionHistoryController";
import TransactionHistoryStore, {
  TransactionKindFilter,
} from "../../database/TransactionHistoryStore";
import { DashboardRange } from "../../dashboard/period";
import useReportPeriod from "../../hooks/useReportPeriod";
import DashboardFilters from "../Dashboard/DashboardFilters";
import "../../styles/Reports.css";
import { TransactionListEntry } from "../../models/TransactionListEntry";
import { PageOptions } from "../../database/Pagination";
import usePagedQuery from "../../hooks/usePagedQuery";
import Price from "../Items/Price";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import PaginationControls from "../utils/PaginationControls";

export default function TransactionsView({
  customerId,
  range: fixedRange,
  kind,
  scope = "",
  refresh = 0,
  customerName,
  contactFilter = false,
}: {
  contactFilter?: boolean;
  customerId?: string;
  customerName?: string;
  range?: DashboardRange;
  kind?: TransactionKindFilter;
  scope?: string;
  refresh?: number;
}) {
  const t = useLocaleText();
  const revision = useDeletionRevision();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionsOS, database } = useDatabase();
  const period = useReportPeriod("all");
  const range = fixedRange ?? period.range;
  const controller = useMemo(
    () =>
      new TransactionHistoryController(
        new TransactionHistoryStore(database),
        transactionsOS,
      ),
    [database, transactionsOS],
  );
  const [requestedKind, setKind] = useListFilter(
    scope ? `${scope}-kind` : "kind",
  );
  const selectedKind =
    kind ??
    (requestedKind === "sale" || requestedKind === "payment"
      ? requestedKind
      : undefined);
  const [contactSelection, setContactSelection] = useListFilter("contact");
  const membership =
    contactFilter &&
    (contactSelection === "linked" || contactSelection === "unlinked")
      ? contactSelection
      : undefined;
  const selectedCustomer =
    customerId ??
    (contactFilter && !["all", "linked", "unlinked"].includes(contactSelection)
      ? contactSelection
      : undefined);
  const query = useCallback(
    (options: PageOptions) => {
      void refresh;
      void revision;
      return range
        ? controller.getPage(
            { ...options, includeDeleted: range.includeDeleted },
            range,
            selectedKind,
            selectedCustomer,
            membership,
          )
        : Promise.reject(new Error());
    },
    [
      range,
      controller,
      selectedKind,
      selectedCustomer,
      membership,
      refresh,
      revision,
    ],
  );
  const pagination = usePagedQuery(query, scope);
  const columns: CustomTableColumn<TransactionListEntry>[] = [
    {
      key: "time",
      header: text.TRANSACTION_TABLE_HEADER_TIME,
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: "kind",
      header: t("PAYMENT_TYPE"),
      render: (row) =>
        t(row.kind === "payment" ? "PAYMENT_TITLE" : "PAYMENT_SALE"),
    },
    {
      key: "contact",
      header: t("CONTACT_NAME"),
      render: (row) =>
        row.contacts?.length
          ? row.contacts.map((contact) => contact.name).join(", ")
          : t("TRANSACTION_NO_CUSTOMER"),
    },
    {
      key: "items",
      header: text.TRANSACTION_TABLE_HEADER_NUM_OF_ITEMS,
      variant: "numeric",
      render: (row) => row.itemCount,
    },
    {
      key: "total",
      header:
        selectedKind === "payment"
          ? t("PAYMENT_AMOUNT")
          : text.TRANSACTION_TABLE_HEADER_TOTAL,
      variant: "numeric",
      render: (row) => (
        <Price price={selectedKind === "payment" ? -row.total : row.total} />
      ),
    },
    {
      key: "actions",
      header: t("UI_ACTIONS"),
      variant: "actions",
      render: (row) => (
        <DeleteRecordButton
          table="TRANSACTIONS"
          id={row.id}
          name={row.id}
          deleted={!!row.deletedAt}
        />
      ),
    },
  ];
  return (
    <>
      {!fixedRange && <DashboardFilters {...period} />}

      {!range ? (
        <p role="alert">{t("DASH_INVALID")}</p>
      ) : (
        <>
          <ReportToolbar
            actions={
              <PrintReportButton
                disabled={!range}
                createReport={async () => {
                  const result = await query({
                    page: 1,
                    pageSize: 0,
                    sort: pagination.sort,
                  });
                  const title = customerName
                    ? t("CUSTOMER_TRANSACTIONS_TITLE", {
                        CUSTOMER_NAME: customerName,
                      })
                    : t(
                        selectedKind === "payment"
                          ? "REPORT_PAYMENTS"
                          : "TRANSACTIONS_TITLE",
                      );
                  return {
                    title,
                    range,
                    sections: [
                      printTable(title, result.rows, columns),
                      {
                        title: t("TOTAL"),
                        columns: [t("PRINT_METRIC"), t("PRINT_VALUE")],
                        rows: [
                          [
                            t(
                              selectedKind === "payment"
                                ? "DASH_PAYMENT_COUNT"
                                : "CUSTOMERS_TRANSACTIONS_NUM_OF_TRANS",
                            ),
                            result.rows.length,
                          ],
                          [
                            t(
                              selectedKind === "payment"
                                ? "DASH_PAYMENTS"
                                : "TOTAL",
                            ),
                            <Price
                              price={result.rows.reduce(
                                (sum, row) =>
                                  sum +
                                  (selectedKind === "payment"
                                    ? -row.total
                                    : row.total),
                                0,
                              )}
                            />,
                          ],
                        ],
                      },
                    ],
                  };
                }}
              />
            }
          >
            <PaginationControls
              filters={
                <>
                  {contactFilter && (
                    <TransactionContactFilter
                      value={contactSelection}
                      onChange={setContactSelection}
                    />
                  )}
                  {!kind && (
                    <label className="pagination-field">
                      {t("FILTER_TYPE")}
                      <Select value={selectedKind ?? "all"} onChange={setKind}>
                        <option value="all">{t("FILTER_ALL_TYPES")}</option>
                        <option value="sale">{t("PAYMENT_SALE")}</option>
                        <option value="payment">{t("REPORT_PAYMENTS")}</option>
                      </Select>
                    </label>
                  )}
                </>
              }
              extraSorts
              page={pagination.page}
              pageSize={pagination.pageSize}
              sort={pagination.sort}
              total={pagination.result?.total ?? 0}
              busy={pagination.loading}
              onChange={pagination.change}
            />
          </ReportToolbar>
          {pagination.error ? (
            <p role="alert">{t("PAGINATION_ERROR")}</p>
          ) : pagination.loading ? (
            <p role="status">{t("PAGINATION_LOADING")}</p>
          ) : (
            <CustomTableView
              label={t(
                selectedKind === "payment"
                  ? "REPORT_PAYMENTS"
                  : "TRANSACTIONS_TITLE",
              )}
              emptyTitle={t(
                selectedKind === "payment"
                  ? "REPORT_NO_PAYMENTS"
                  : "UI_NO_TRANSACTIONS_YET",
              )}
              emptyDescription={
                selectedKind === "payment"
                  ? undefined
                  : t("UI_POSTED_SALES_WILL_APPEAR_HERE_CREATE_A_SALE_FROM")
              }
              data={pagination.result?.rows ?? []}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                navigate(
                  `/transaction?id=${encodeURIComponent(row.id)}${range?.includeDeleted ? "&deleted=1" : ""}`,
                  {
                    state: {
                      returnTo:
                        location.pathname +
                        location.search +
                        (customerId ? "#transactions" : ""),
                      returnState: location.state,
                    },
                  },
                )
              }
            />
          )}
        </>
      )}
    </>
  );
}
