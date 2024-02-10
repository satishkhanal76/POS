import { Route, Routes } from "react-router-dom";
import "./styles/modern-normalize.css";
import "./App.css";
import NavBar from "./components/NavBar";
import POS from "./components/POS";
import Customers from "./components/Customers";
import Items from "./components/Items";

function App() {
  return (
    <div className="App">
      <NavBar />
      <Routes>
        <Route path="/" Component={() => <POS />}></Route>
        <Route path="/customers" Component={() => <Customers />}></Route>
        <Route path="/items" Component={() => <Items />}></Route>
      </Routes>
    </div>
  );
}

export default App;
