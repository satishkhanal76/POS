import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";
import { ITransaction } from "../../models/Transaction";
import TransactionsItemsContainer from "./TransactionsItemsContainer";
import "./TransactionView.css";

interface TransactionViewProps {
  transaction: ITransaction;
  onDoubleClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
  onClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
  activeItem: IProductTransactionItem | IDiscountTransactionItem;
}

const TransactionView = ({
  transaction,
  onDoubleClick,
  onClick,
  activeItem,
}: TransactionViewProps) => {

  return (
    <div className="transaction-container">
      <header className="transaction-title">
        <div><h2>{transaction.isPosted() ? 'Transaction details' : 'Current order'}</h2><time dateTime={new Date(transaction.getTimestamp()).toISOString()}>{new Date(transaction.getTimestamp()).toLocaleString()}</time></div>
        <span className="transaction-item-count">{transaction.getAllTransactionProductItems().length} items</span>
      </header>
      <TransactionsItemsContainer
        productItems={transaction.getAllTransactionProductItems()}
        discountItems={transaction.getAllTransactionDiscountItems()}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        total={transaction.getTotal()}
        activeItem={activeItem}
      ></TransactionsItemsContainer>
    </div>
  );
};

export default TransactionView;
