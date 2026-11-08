import DatabaseMaintenanceStatus from "./components/App/DatabaseMaintenanceStatus";
import PurchasesPage from "./components/pages/PurchasesPage";
import PurchasePage from "./components/pages/PurchasePage";
import ContactPage from "./components/pages/ContactPage";
import OverviewPage from "./components/pages/OverviewPage";
import DashboardPage from "./components/pages/DashboardPage";
import AppStatus from "./components/App/AppStatus";
import PriceHistoryPage from "./components/pages/PriceHistoryPage";
import DemoWelcome from "./components/Workspace/DemoWelcome";
import DemoBanner from "./components/Workspace/DemoBanner";
import { Route, Routes } from "react-router-dom";
import "./styles/modern-normalize.css";
import "./App.css";
import NavBar from "./components/NavBar";
import ItemsPage from "./components/pages/ItemsPage";
import POSPage from "./components/pages/POSPage";
import ContactsPage from "./components/pages/ContactsPage";
import TransactionPage from "./components/pages/TransactionPage";
import TransactionsPage from "./components/pages/TransactionsPage";
import SettingsPage from "./components/pages/SettingsPage";

function App() {
  return (
    <div className="container App">
      <NavBar />
      <AppStatus />
      <DatabaseMaintenanceStatus />
      <DemoBanner />
      <DemoWelcome />
      <Routes>
        <Route path="/contacts" Component={ContactsPage} />
        <Route path="/contact" Component={ContactPage} />
        <Route path="/purchases" Component={PurchasesPage} />
        <Route path="/purchase" Component={PurchasePage} />
        <Route path="/dashboard" Component={DashboardPage} />
        <Route path="/overview" Component={OverviewPage} />
        <Route path="/" Component={() => <POSPage />}></Route>
        <Route path="/customers" Component={() => <ContactsPage />}></Route>
        <Route path="/items" Component={() => <ItemsPage />}></Route>
        <Route path="/transaction" Component={() => <TransactionPage />} />
        <Route path="/price-history" Component={PriceHistoryPage} />
        <Route path="/transactions" Component={() => <TransactionsPage />} />
        <Route path="/settings" Component={() => <SettingsPage />} />
      </Routes>
    </div>
  );
}

export default App;
