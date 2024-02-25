import { rt, useLocale } from "../../contexts/Locale";
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
  const { ACTIVE_TRANSACTION_TITLE } = useLocale();

  return (
    <div className="transaction-container">
      <div className="transaction-title">
        {rt(ACTIVE_TRANSACTION_TITLE, {
          TRANSACTION_DATE: new Date(transaction.getTimestamp()).toISOString(),
        })}
      </div>
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
