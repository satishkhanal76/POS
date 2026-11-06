import BackLink from "../Layout/BackLink";
import CustomerActivityStore from "../../database/CustomerActivityStore";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import Price from "../Items/Price";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useLocaleText } from "../../contexts/Locale";
import { useDatabase } from "../../contexts/DatabaseContext";
import { ICustomer } from "../../models/Customer";
import TransactionsView from "../Transactions/TransactionsView";
import PageHeader from "../Layout/PageHeader";
import "./TransactionPage.css";

export default function CustomerTransactionsPage() {
  const t = useLocaleText();
  const { includeDeleted } = useDeletedVisibility();
  const revision = useDeletionRevision();
  const { customerOS, database } = useDatabase();
  const [balance, setBalance] = useState<{ id: string; total: number } | null>(
    null,
  );
  const [params] = useSearchParams();
  const id = params.get("id");
  const location = useLocation();
  const [result, setResult] = useState<{
    id: string | null;
    customer: ICustomer | null;
  } | null>(null);
  const requestedReturn: unknown = location.state?.returnTo;
  const returnTo =
    typeof requestedReturn === "string" &&
    /^\/(customers-transactions|dashboard|overview|contact)(\?|$)/.test(
      requestedReturn,
    )
      ? requestedReturn
      : "/customers-transactions";
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setResult({ id, customer: null });
      return;
    }
    setBalance(null);
    new CustomerActivityStore(database)
      .getBalance(id, includeDeleted)
      .then((total) => {
        if (!cancelled) setBalance({ id, total });
      })
      .catch(() => {});
    customerOS
      .getOne(id, includeDeleted)
      .then((customer) => {
        if (!cancelled) setResult({ id, customer });
      })
      .catch(() => {
        if (!cancelled) setResult({ id, customer: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, customerOS, database, includeDeleted, revision]);
  const current = result?.id === id ? result : null;
  return (
    <main className="transaction-page">
      <div className="transaction-toolbar">
        <BackLink to={returnTo}>
          {returnTo.startsWith("/contact?")
            ? t("CONTACT_BACK_ACCOUNT")
            : returnTo.startsWith("/dashboard") ||
                returnTo.startsWith("/overview")
              ? t("REPORT_BACK")
              : t("UI_BACK_TO_CUSTOMER_TRANSACTIONS")}
        </BackLink>
      </div>
      <PageHeader
        title={
          current?.customer
            ? t("CUSTOMER_TRANSACTIONS_TITLE", {
                CUSTOMER_NAME: current.customer.getName(),
              })
            : t("CUSTOMERS_TRANSACTIONS_TITLE")
        }
      />
      {current?.customer && balance?.id === id && (
        <div className="transaction-customer">
          <span>{t("PAYMENT_BALANCE")}</span>
          <Price price={balance.total} />
        </div>
      )}
      {!current ? (
        <p role="status">{t("UI_LOADING_CUSTOMER_TRANSACTIONS")}</p>
      ) : current.customer && id ? (
        <TransactionsView
          customerId={id}
          customerName={current.customer.getName()}
        />
      ) : (
        <p role="alert">{t("PAGINATION_CUSTOMER_MISSING")}</p>
      )}
    </main>
  );
}
