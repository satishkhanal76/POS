import { ITransactionItemViewer } from "../../model/TransactionItem";
import "./Transaction.css";

interface CTransactionItemProps {
  transactionItem: ITransactionItemViewer;
  isActiveTransactionItem: boolean;
  handleClick: (transactionItem: ITransactionItemViewer) => void;
}

const CTransactionItem = ({
  transactionItem,
  isActiveTransactionItem,
  handleClick,
}: CTransactionItemProps) => {
  return (
    <div
      onClick={() => handleClick(transactionItem)}
      key={transactionItem.getItem().getId()}
      className={
        isActiveTransactionItem ? "transaction-item active" : "transaction-item"
      }
    >
      <span className="quantity">{transactionItem.getQuantity()}</span>
      <span className="name">{transactionItem.getItem().getName()}</span>
      <span className="price">${transactionItem.getPrice()}</span>
    </div>
  );
};

export default CTransactionItem;
