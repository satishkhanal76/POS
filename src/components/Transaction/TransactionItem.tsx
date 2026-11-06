import { useLocaleText } from "../../contexts/Locale";
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
  const t = useLocaleText();
  return (
    <div
      className={`transaction-item ${isActiveTransactionItem && "active"} ${
        isDiscountItem && "deduction"
      }`}
      {...otherProps}
      role="button"
      tabIndex={0}
      aria-pressed={isActiveTransactionItem}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <span className="quantity">{transactionItem.getQuantity()}</span>
      <span className="name">
        {transactionItem.getItem().getName()}
        {transactionItem.getItem().deletedAt && (
          <small className="deleted-badge">{t("DELETED_BADGE")}</small>
        )}
      </span>
      <Price
        isDeductionItem={isDiscountItem}
        price={transactionItem.getAmount()}
      ></Price>
    </div>
  );
};

export default TransactionItem;
