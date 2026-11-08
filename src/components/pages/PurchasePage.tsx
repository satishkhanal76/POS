import PurchasePayments from "../Purchasing/PurchasePayments";
import { MdPayments } from "react-icons/md";
import "../Purchasing/PurchaseDetails.css";
import SupplierPaymentForm from "../Purchasing/SupplierPaymentForm";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import { purchaseInvoice } from "../../purchasing/invoice";
import { dashboardRange, dateInput } from "../../dashboard/period";
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import {
  PurchaseSchema,
  PurchaseLineSchema,
  SupplierPaymentSchema,
} from "../../models/Purchase";
import PageHeader from "../Layout/PageHeader";
import BackLink from "../Layout/BackLink";
import DeleteRecordButton from "../utils/DeleteRecordButton";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import Price from "../Items/Price";
import PrintReportButton from "../Reports/PrintReportButton";
import printTable from "../Reports/printTable";
export default function PurchasePage() {
  const t = useLocaleText(),
    stores = useDatabase(),
    settings = useClientGlobal(),
    [params] = useSearchParams(),
    { includeDeleted } = useDeletedVisibility(),
    location = useLocation(),
    navigate = useNavigate(),
    id = params.get("id"),
    payment = params.get("kind") === "supplier-payment";
  const [data, setData] = useState<
      PurchaseSchema | SupplierPaymentSchema | null
    >(null),
    [lines, setLines] = useState<PurchaseLineSchema[]>([]),
    [error, setError] = useState(""),
    [paymentOpen, setPaymentOpen] = useState(false);
  const requested: unknown = location.state?.returnTo,
    back =
      typeof requested === "string" &&
      /^\/(purchases|contact|purchase)(\?|$)/.test(requested)
        ? requested
        : "/purchases";
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setError("");
    setData(null);
    setPaymentOpen(false);
    Promise.all([
      payment
        ? stores.purchasingOS.payments.getOne(id, includeDeleted)
        : stores.purchasingOS.purchases.getOne(id, includeDeleted),
      payment
        ? Promise.resolve([])
        : stores.purchasingOS.lines.getAllByIndexName("purchaseId", id),
    ])
      .then(([header, items]) => {
        if (!cancelled) {
          setData(header);
          setLines(items);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("PAGINATION_ERROR"));
      });
    return () => {
      cancelled = true;
    };
  }, [stores, id, payment, includeDeleted, t]);
  const columns: CustomTableColumn<PurchaseLineSchema>[] = [
    { key: "name", header: t("UI_ITEM"), render: (row) => row.name },
    {
      key: "quantity",
      header: t("QUANTITY_LABEL"),
      render: (row) => row.quantity,
    },
    {
      key: "cost",
      header: t("BUY_UNIT_COST"),
      render: (row) => <Price price={row.unitCost} />,
    },
    {
      key: "total",
      header: t("TOTAL"),
      render: (row) => <Price price={row.total} />,
    },
  ];
  return (
    <main className="transaction-page purchase-details-page">
      <BackLink to={back} state={location.state?.returnState}>
        {t("REPORT_BACK")}
      </BackLink>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">{t("PAGINATION_LOADING")}</p>
      ) : (
        <>
          <PageHeader
            title={t(payment ? "BUY_PAYMENT" : "BUY_PURCHASE")}
            description={`${new Date(data.timestamp).toLocaleDateString()} · ${payment ? data.reference : purchaseInvoice(data)}`}
            actions={
              <>
                {!payment && !data.deletedAt && settings.purchasing && (
                  <button
                    type="button"
                    className="purchase-pay-action"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <MdPayments aria-hidden="true" />
                    {t("BUY_PAY")}
                  </button>
                )}
                <PrintReportButton
                  createReport={() => ({
                    title: t(payment ? "BUY_PAYMENT" : "BUY_PURCHASE"),
                    range: dashboardRange(
                      "day",
                      dateInput(new Date(data.timestamp)),
                      "",
                    ),
                    note: `${data.contactName} · ${payment ? data.reference : purchaseInvoice(data)} · ${new Date(data.timestamp).toLocaleDateString()}`,
                    sections: [
                      payment
                        ? {
                            title: t("BUY_AMOUNT_PAID"),
                            columns: [t("PRINT_VALUE")],
                            rows: [
                              [
                                <Price
                                  price={"amount" in data ? data.amount : 0}
                                />,
                              ],
                            ],
                          }
                        : printTable(t("BUY_PURCHASE"), lines, columns),
                    ],
                  })}
                />
                <DeleteRecordButton
                  variant="standalone"
                  table={payment ? "SUPPLIER_PAYMENTS" : "PURCHASES"}
                  id={data.id}
                  name={
                    payment
                      ? data.reference || t("BUY_PAYMENT")
                      : purchaseInvoice(data)
                  }
                  deleted={!!data.deletedAt}
                  onDeleted={() => navigate(back)}
                />
              </>
            }
          />
          <p>
            <Link
              to={`/contact?id=${encodeURIComponent(data.contactId)}${includeDeleted ? "&deleted=1" : ""}`}
            >
              {data.contactName}
            </Link>
          </p>
          <h2>
            <Price price={"amount" in data ? data.amount : data.total} />
          </h2>

          {paymentOpen && !payment && !data.deletedAt && "total" in data && (
            <SupplierPaymentForm
              key={data.id}
              contactId={data.contactId}
              initialReference={purchaseInvoice(data)}
              initialAmount={data.total}
              onClose={() => setPaymentOpen(false)}
              onSaved={() => setPaymentOpen(false)}
            />
          )}
          {!payment && (
            <>
              <CustomTableView
                label={t("BUY_PURCHASE")}
                data={lines}
                columns={columns}
                rowKey={(row) => row.id}
              />
              <PurchasePayments
                key={data.id}
                contactId={data.contactId}
                reference={purchaseInvoice(data)}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
