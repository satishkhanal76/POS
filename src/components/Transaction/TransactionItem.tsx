import { HtmlHTMLAttributes } from "react";
import Price from "../Items/Price";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";
import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";

interface TransactionItemProps extends HtmlHTMLAttributes<HTMLDivElement> {
  transactionItem: IProductTransactionItem | IDiscountTransactionItem;
  isActiveTransactionItem: boolean;
  isDiscountItem?: boolean;
}

const TransactionItem = ({
  transactionItem,
  isActiveTransactionItem,
  isDiscountItem,
  ...otherProps
}: TransactionItemProps) => {
  return (
    <div
      className={`transaction-item ${isActiveTransactionItem && "active"} ${
        isDiscountItem && "deduction"
      }`}
      {...otherProps}
    >
      <span className="quantity">{transactionItem.getQuantity()}</span>
      <span className="name">{transactionItem.getItem().getName()}</span>
      <Price
        isDeductionItem={isDiscountItem}
        price={transactionItem.getAmount()}
      ></Price>
    </div>
  );
};

export default TransactionItem;
