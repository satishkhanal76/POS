import React from "react";
import { ITransactionItemViewer } from "../../model/TransactionItem";
import TransactionItem from "./TransactionItem";

interface TransactionsItemsContainerProps {
  transactionItems: ITransactionItemViewer[];
  onDoubleClick: (transactionItem: ITransactionItemViewer) => void;
  onClick: (transactionItem: ITransactionItemViewer) => void;
  total: number;
  activeItem: ITransactionItemViewer | null;
}

const TransactionsItemsContainer = ({
  transactionItems,
  onDoubleClick,
  onClick,
  activeItem,
  total,
}: TransactionsItemsContainerProps) => {
  return (
    <div>
      <div className="transaction-items-container">
        {transactionItems &&
          transactionItems.map((transactionItem, i) => (
            <TransactionItem
              onDoubleClick={() => onDoubleClick(transactionItem)}
              key={i}
              transactionItem={transactionItem}
              isActiveTransactionItem={activeItem === transactionItem}
              onClick={() => onClick(transactionItem)}
            />
          ))}
      </div>
      <div className="transaction-details">
        <span>Total</span>
        <span>${total}</span>
      </div>
    </div>
  );
};

export default TransactionsItemsContainer;
