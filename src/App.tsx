import { Route, Routes } from "react-router-dom";
import "./styles/modern-normalize.css";
import "./App.css";
import NavBar from "./components/NavBar";
import POS from "./components/POS";
import Customers from "./components/Customer/Customers";
import Items from "./components/Items";
import CustomersTransactions from "./components/Customer/CustomersTransactions";

function App() {
  return (
    <div className="App">
      <NavBar />
      <Routes>
        <Route path="/" Component={() => <POS />}></Route>
        <Route path="/customers" Component={() => <Customers />}></Route>
        <Route path="/items" Component={() => <Items />}></Route>
        <Route
          path="/customers-transactions"
          Component={() => <CustomersTransactions />}
        ></Route>
        <Route path="/transaction" Component={() => <POS />} />
      </Routes>
    </div>
  );
}

export default App;
