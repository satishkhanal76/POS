import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import PurchasingController from "../../controllers/PurchasingController";
import { PageOptions } from "../../database/Pagination";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import usePagedQuery from "../../hooks/usePagedQuery";
import { SupplierPaymentSchema } from "../../models/Purchase";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import PaginationControls from "../utils/PaginationControls";
import Price from "../Items/Price";

/** Reference matching is informational; payments still reduce the supplier's account. */
export default function PurchasePayments({
  contactId,
  reference,
}: {
  contactId: string;
  reference: string;
}) {
  const t = useLocaleText(),
    { purchasingOS } = useDatabase();
  const revision = useDeletionRevision(),
    location = useLocation(),
    navigate = useNavigate();
  const controller = useMemo(
    () => new PurchasingController(purchasingOS),
    [purchasingOS],
  );
  const query = useCallback(
    (options: PageOptions) => {
      void revision;
      return controller.getPurchasePayments(contactId, reference, options);
    },
    [controller, contactId, reference, revision],
  );
  const pagination = usePagedQuery(query, "purchase-payments");
  const columns: CustomTableColumn<SupplierPaymentSchema>[] = [
    {
      key: "date",
      header: t("TRANSACTION_TABLE_HEADER_TIME"),
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      key: "reference",
      header: t("BUY_REFERENCE"),
      render: (row) => row.reference,
    },
    {
      key: "amount",
      header: t("BUY_AMOUNT_PAID"),
      variant: "numeric",
      render: (row) => <Price price={row.amount} />,
    },
  ];
  if (!pagination.loading && !pagination.error && !pagination.result?.total)
    return null;
  return (
    <section
      className="purchase-payments"
      aria-label={t("BUY_PURCHASE_PAYMENTS")}
    >
      <h2>{t("BUY_PURCHASE_PAYMENTS")}</h2>
      {pagination.loading ? (
        <p role="status">{t("PAGINATION_LOADING")}</p>
      ) : pagination.error ? (
        <p role="alert">{t("PAGINATION_ERROR")}</p>
      ) : (
        <>
          <PaginationControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            sort={pagination.sort}
            total={pagination.result?.total ?? 0}
            busy={pagination.loading}
            onChange={pagination.change}
          />
          <CustomTableView
            label={t("BUY_PURCHASE_PAYMENTS")}
            data={pagination.result?.rows ?? []}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              navigate(
                `/purchase?id=${encodeURIComponent(row.id)}&kind=supplier-payment`,
                { state: { returnTo: location.pathname + location.search } },
              )
            }
          />
        </>
      )}
    </section>
  );
}
