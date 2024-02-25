import { Route, Routes } from "react-router-dom";
import "./styles/modern-normalize.css";
import "./App.css";
import NavBar from "./components/NavBar";
import CustomersTransactions from "./components/Customer/CustomersTransactions";
import ItemsPage from "./components/pages/ItemsPage";
import POSPage from "./components/pages/POSPage";
import CustomersPage from "./components/pages/CustomersPage";
import TransactionPage from "./components/pages/TransactionPage";
import TransactionsPage from "./components/pages/TransactionsPage";

function App() {
  return (
    <div className="App">
      <NavBar />
      <Routes>
        <Route path="/" Component={() => <POSPage />}></Route>
        <Route path="/customers" Component={() => <CustomersPage />}></Route>
        <Route path="/items" Component={() => <ItemsPage />}></Route>
        <Route
          path="/customers-transactions"
          Component={() => <CustomersTransactions />}
        ></Route>
        <Route path="/transaction" Component={() => <TransactionPage />} />
        <Route path="/transactions" Component={() => <TransactionsPage />} />
      </Routes>
    </div>
  );
}

export default App;
