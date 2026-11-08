import TransactionsView from "../Transactions/TransactionsView";
import DashboardFilters from "../Dashboard/DashboardFilters";
import useReportPeriod from "../../hooks/useReportPeriod";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import CustomerActivityStore from "../../database/CustomerActivityStore";
import { IContact } from "../../models/Contact";
import PageHeader from "../Layout/PageHeader";
import BackLink from "../Layout/BackLink";
import Price from "../Items/Price";
import PurchasingHistory from "../Purchasing/PurchasingHistory";
import SupplierPaymentForm from "../Purchasing/SupplierPaymentForm";
import "../Purchasing/Purchasing.css";
export default function ContactPage() {
  const period = useReportPeriod("all");
  const t = useLocaleText(),
    stores = useDatabase(),
    settings = useClientGlobal(),
    { includeDeleted } = useDeletedVisibility(),
    revision = useDeletionRevision(),
    [params] = useSearchParams(),
    location = useLocation(),
    id = params.get("id");
  const [contact, setContact] = useState<IContact | null>(null),
    [balances, setBalances] = useState({ sales: 0, purchases: 0 }),
    [error, setError] = useState(""),
    [entry, setEntry] = useState<"payment" | null>(null);
  useEffect(() => {
    let cancelled = false;
    setContact(null);
    setError("");
    if (!id) return;
    Promise.all([
      stores.contactOS.getOne(id, includeDeleted),
      new CustomerActivityStore(stores.database).getBalance(id, includeDeleted),
      stores.purchasingOS.balance(id, includeDeleted),
    ])
      .then(([person, sales, purchases]) => {
        if (!cancelled) {
          setContact(person);
          setBalances({ sales, purchases });
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("PAGINATION_CUSTOMER_MISSING"));
      });
    return () => {
      cancelled = true;
    };
  }, [stores, id, includeDeleted, revision, t]);
  useEffect(() => {
    if (!contact || !["#transactions", "#purchases"].includes(location.hash))
      return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView(),
    );
    return () => cancelAnimationFrame(frame);
  }, [contact, location.hash]);
  const requested: unknown = location.state?.returnTo;
  const back =
    typeof requested === "string" &&
    /^\/(contacts|customers|transactions|dashboard|overview)(\?|$)/.test(
      requested,
    )
      ? requested
      : "/contacts";
  return (
    <main className="dashboard-page">
      <BackLink to={back}>
        {t(
          back.startsWith("/dashboard") || back.startsWith("/overview")
            ? "REPORT_BACK"
            : back.startsWith("/transactions")
              ? "UI_BACK_TO_TRANSACTIONS"
              : "CONTACT_BACK",
        )}
      </BackLink>
      {error ? (
        <p role="alert">{error}</p>
      ) : !contact ? (
        <p role="status">{t("PAGINATION_LOADING")}</p>
      ) : (
        <>
          <PageHeader
            title={contact.getName()}
            description={contact.getPhoneNumber()}
            actions={
              settings.purchasing &&
              !contact.deletedAt && (
                <>
                  <Link
                    className="page-back-link"
                    to={`/?mode=purchase&supplier=${encodeURIComponent(contact.getId())}`}
                  >
                    {t("BUY_NEW")}
                  </Link>
                  <button type="button" onClick={() => setEntry("payment")}>
                    {t("BUY_PAY")}
                  </button>
                </>
              )
            }
          />
          <p>{t("CONTACT_BALANCE_HELP")}</p>
          <section className="contact-balances">
            <article>
              <h2>{t("CONTACT_THEY_OWE")}</h2>
              <Price price={balances.sales} />
            </article>
            {settings.purchasing && (
              <article>
                <h2>{t("CONTACT_WE_OWE")}</h2>
                <Price price={balances.purchases} />
              </article>
            )}
          </section>
          <DashboardFilters {...period} />
          {period.range ? (
            <>
              <section
                id="transactions"
                className="contact-history-section"
                aria-labelledby="contact-sales-title"
              >
                <h2 id="contact-sales-title">{t("CONTACT_SALES")}</h2>
                <TransactionsView
                  customerId={contact.getId()}
                  customerName={contact.getName()}
                  range={period.range}
                  scope="sales"
                />
              </section>
              {settings.purchasing && (
                <section
                  id="purchases"
                  className="contact-history-section"
                  aria-labelledby="contact-purchases-title"
                >
                  <h2 id="contact-purchases-title">{t("BUY_HISTORY")}</h2>
                  <PurchasingHistory
                    contactId={contact.getId()}
                    range={period.range}
                  />
                </section>
              )}
            </>
          ) : (
            <p role="alert">{t("DASH_INVALID")}</p>
          )}
          {entry && (
            <SupplierPaymentForm
              contactId={contact.getId()}
              onClose={() => setEntry(null)}
              onSaved={() => setEntry(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
