import "../styles/POS.css";
import POSButtons from "./POSButtons";
import Transactions from "./Transactions";

const POS = () => {
  return (
    <div className="pos-container">
      <POSButtons></POSButtons>
      <Transactions></Transactions>
    </div>
  );
};

export default POS;
