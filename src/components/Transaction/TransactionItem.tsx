import { HtmlHTMLAttributes } from "react";
import { ITransactionItemViewer } from "../../model/TransactionItem";
import "./Transaction.css";
import Price from "../Items/Price";

interface TransactionItemProps extends HtmlHTMLAttributes<HTMLDivElement> {
  transactionItem: ITransactionItemViewer;
  isActiveTransactionItem: boolean;
}

const TransactionItem = ({
  transactionItem,
  isActiveTransactionItem,
  ...otherProps
}: TransactionItemProps) => {
  return (
    <div
      className={
        isActiveTransactionItem ? "transaction-item active" : "transaction-item"
      }
      {...otherProps}
    >
      <span className="quantity">{transactionItem.getQuantity()}</span>
      <span className="name">{transactionItem.getItem().getName()}</span>
      <Price price={transactionItem.getPrice()}></Price>
    </div>
  );
};

export default TransactionItem;
