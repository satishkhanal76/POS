import { Link } from "react-router-dom";
import "./NavBar.css";
import { useLocale } from "../contexts/Locale";

const NavBar = () => {
  const text = useLocale();
  return (
    <>
      <nav className="top-nav">
        <div className="nav-left">
          <Link className="link-item" to={"/"}>
            {text.WEB_NAME}
          </Link>
        </div>
        <div className="nav-right">
          <Link className="link-item" to={"/customers"}>
            {text.NAVBAR_ITEM_1}
          </Link>
          <Link className="link-item" to={"/items"}>
            {text.NAVBAR_ITEM_2}
          </Link>
          <Link className="link-item" to={"/transactions"}>
            {text.NAVBAR_ITEM_3}
          </Link>
          <Link className="link-item" to={"/customers-transactions"}>
            {text.NAVBAR_ITEM_4}
          </Link>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
