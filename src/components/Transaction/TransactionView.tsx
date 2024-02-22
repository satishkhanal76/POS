import { ITransaction } from "../../model/Transaction";
import { rt, useLocale } from "../../contexts/Locale";
import { ITransactionItemViewer } from "../../model/TransactionItem";
import TransactionsItemsContainer from "./TransactionsItemsContainer";

interface TransactionViewProps {
  transaction: ITransaction;
  onDoubleClick: (transactionItem: ITransactionItemViewer) => void;
  onClick: (transactionItem: ITransactionItemViewer) => void;
  activeItem: ITransactionItemViewer;
}

const TransactionView = ({
  transaction,
  onDoubleClick,
  onClick,
  activeItem,
}: TransactionViewProps) => {
  const { ACTIVE_TRANSACTION_TITLE } = useLocale();

  const transactionItems: ITransactionItemViewer[] = transaction.getItems();
  return (
    <div className="transaction-container">
      <div className="transaction-title">
        {rt(ACTIVE_TRANSACTION_TITLE, {
          TRANSACTION_DATE: new Date(transaction.getTimestamp()).toISOString(),
        })}
      </div>
      <TransactionsItemsContainer
        transactionItems={transactionItems}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        total={transaction.getTotal()}
        activeItem={activeItem}
      ></TransactionsItemsContainer>
    </div>
  );
};

export default TransactionView;
