import Price from "../Items/Price";
import { useLocaleText } from '../../contexts/Locale';
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
  activeItem: IProductTransactionItem | IDiscountTransactionItem | null;
}

const TransactionView = ({
  transaction,
  onDoubleClick,
  onClick,
  activeItem,
}: TransactionViewProps) => {
  const t = useLocaleText();

  return (
    <div className="transaction-container">
      <header className="transaction-title">
        <div><h2>{transaction.isPosted() ? t('UI_TRANSACTION_DETAILS') : t('UI_CURRENT_ORDER')}</h2><time dateTime={new Date(transaction.getTimestamp()).toISOString()}>{new Date(transaction.getTimestamp()).toLocaleString()}</time></div>
        <span className="transaction-item-count">{transaction.getKind() === 'payment' ? t('PAYMENT_TITLE') : t(transaction.getAllTransactionProductItems().length === 1 ? 'TRANSACTION_ITEM_COUNT_ONE' : 'TRANSACTION_ITEM_COUNT_OTHER', { count: transaction.getAllTransactionProductItems().length })}</span>
      </header>
      {transaction.getKind() === "payment" ? <div className="payment-detail"><h3>{t("PAYMENT_TITLE")}</h3><p>{t("PAYMENT_DESCRIPTION")}</p><Price price={-transaction.getTotal()} /></div> : <TransactionsItemsContainer
        productItems={transaction.getAllTransactionProductItems()}
        discountItems={transaction.getAllTransactionDiscountItems()}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        total={transaction.getTotal()}
        activeItem={activeItem}
      ></TransactionsItemsContainer>}
    </div>
  );
};

export default TransactionView;
