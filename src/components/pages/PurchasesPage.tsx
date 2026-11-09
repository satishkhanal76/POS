import PurchasingHistory from "../Purchasing/PurchasingHistory";
import "../../styles/Reports.css";
import "../Purchasing/Purchasing.css";

export default function PurchasesPage() {
  return (
    <main className="dashboard-page">
      <PurchasingHistory standalone />
    </main>
  );
}
