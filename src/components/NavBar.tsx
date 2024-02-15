import { Link } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => {
  return (
    <>
      <nav className="top-nav">
        <div className="nav-left">
          <Link className="link-item" to={"/"}>
            POS
          </Link>
        </div>
        <div className="nav-right">
          <Link className="link-item" to={"/customers"}>
            Customers
          </Link>
          <Link className="link-item" to={"/items"}>
            Items
          </Link>
          <Link className="link-item" to={"/customers-transactions"}>
            Customers Transactions
          </Link>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
