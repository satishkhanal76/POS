import React from "react";
import { ITransactionItemViewer } from "../../model/TransactionItem";
import TransactionItem from "./TransactionItem";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import { useLocale } from "../../contexts/Locale";
import Price from "../Items/Price";

interface TransactionsItemsContainerProps {
  transactionItems: ITransactionItemViewer[];
  onDoubleClick: (transactionItem: ITransactionItemViewer) => void;
  onClick: (transactionItem: ITransactionItemViewer) => void;
  total: number;
  activeItem: ITransactionItemViewer;
}

const TransactionsItemsContainer = ({
  transactionItems,
  onDoubleClick,
  onClick,
  activeItem,
  total,
}: TransactionsItemsContainerProps) => {
  const { TOTAL } = useLocale();
  const { currencyCharacter } = useClientGlobal();

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
        <span>{TOTAL}</span>
        <Price price={total}></Price>
      </div>
    </div>
  );
};

export default TransactionsItemsContainer;
