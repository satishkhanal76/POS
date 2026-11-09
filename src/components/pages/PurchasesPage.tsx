import { useClientGlobal } from "../../contexts/ClientGlobal";
import PurchasingHistory from "../Purchasing/PurchasingHistory";
import "../../styles/Reports.css";
import "../Purchasing/Purchasing.css";

export default function PurchasesPage() {
  const settings = useClientGlobal();
  return (
    <main className="dashboard-page">
      <PurchasingHistory
        standalone
        defaultPeriod={settings.historyPeriod}
        defaultSort={settings.purchaseSort}
        defaultFilter={settings.purchaseFilter}
        defaultPageSize={Number(settings.historyPageSize)}
      />
    </main>
  );
}
