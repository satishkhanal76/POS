import { Link } from "react-router-dom";
import { useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import PageHeader from "../Layout/PageHeader";
import SupplierPaymentForm from "../Purchasing/SupplierPaymentForm";
import PurchasingHistory from "../Purchasing/PurchasingHistory";
import "../../styles/Reports.css";
import "../Purchasing/Purchasing.css";
export default function PurchasesPage() {
  const t = useLocaleText(),
    settings = useClientGlobal(),
    [entry, setEntry] = useState<"payment" | null>(null);
  return (
    <main className="dashboard-page">
      <PageHeader
        title={t("BUY_TITLE")}
        description={t("BUY_DESCRIPTION")}
        actions={
          settings.purchasing && (
            <>
              <Link className="page-back-link" to="/?mode=purchase">
                {t("BUY_NEW")}
              </Link>
              <button type="button" onClick={() => setEntry("payment")}>
                {t("BUY_PAY")}
              </button>
            </>
          )
        }
      />
      {!settings.purchasing ? (
        <p>{t("BUY_DISABLED")}</p>
      ) : (
        <PurchasingHistory />
      )}
      {entry && (
        <SupplierPaymentForm
          onClose={() => setEntry(null)}
          onSaved={() => setEntry(null)}
        />
      )}
    </main>
  );
}
