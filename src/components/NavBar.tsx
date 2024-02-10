import { Link } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => {
  return (
    <>
      <nav className="top-nav">
        <Link className="link-item" to={"/"}>
          POS
        </Link>
        <Link className="link-item" to={"/customers"}>
          Customers
        </Link>
        <Link className="link-item" to={"/items"}>
          Items
        </Link>
      </nav>
    </>
  );
};

export default NavBar;
