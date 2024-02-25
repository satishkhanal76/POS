import React from "react";
import TransactionItem from "./TransactionItem";
import { useLocale } from "../../contexts/Locale";
import Price from "../Items/Price";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";
import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";

interface TransactionsItemsContainerProps {
  productItems: IProductTransactionItem[];
  discountItems: IDiscountTransactionItem[];

  onDoubleClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
  onClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
  total: number;
  activeItem: IProductTransactionItem | IDiscountTransactionItem;
}

const TransactionsItemsContainer = ({
  productItems,
  discountItems,
  onDoubleClick,
  onClick,
  activeItem,
  total,
}: TransactionsItemsContainerProps) => {
  const { TOTAL } = useLocale();
  return (
    <div>
      <div className="transaction-items-container">
        {productItems.map((transactionItem, i) => (
          <TransactionItem
            isDiscountItem={false}
            onDoubleClick={() => onDoubleClick(transactionItem)}
            key={i}
            transactionItem={transactionItem}
            isActiveTransactionItem={activeItem === transactionItem}
            onClick={() => onClick(transactionItem)}
          />
        ))}
        {discountItems.map((transactionItem, i) => (
          <TransactionItem
            isDiscountItem={true}
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
