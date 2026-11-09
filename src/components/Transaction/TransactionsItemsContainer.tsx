import CompactOrderLine from "../POS/CompactOrderLine";
import { useLocaleText } from "../../contexts/Locale";
import TransactionItem from "./TransactionItem";
import { useLocale } from "../../contexts/Locale";
import Price from "../Items/Price";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";
import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";

type OrderItem = IProductTransactionItem | IDiscountTransactionItem;

export interface CompactTransactionLines {
  busy: boolean;
  onRemove: (item: OrderItem) => void;
}

interface TransactionsItemsContainerProps {
  compactLines?: CompactTransactionLines;
  productItems: IProductTransactionItem[];
  discountItems: IDiscountTransactionItem[];

  onDoubleClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem,
  ) => void;
  onClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem,
  ) => void;
  total: number;
  activeItem: IProductTransactionItem | IDiscountTransactionItem | null;
}

const TransactionsItemsContainer = ({
  compactLines,
  productItems,
  discountItems,
  onDoubleClick,
  onClick,
  activeItem,
  total,
}: TransactionsItemsContainerProps) => {
  const t = useLocaleText();
  const { TOTAL } = useLocale();
  const renderItem = (item: OrderItem, index: number, deduction: boolean) => {
    const selected = activeItem === item;
    const key = `${deduction}-${index}`;
    if (compactLines) {
      const product = item.getItem();
      return (
        <CompactOrderLine
          key={key}
          label={product.getName()}
          name={
            <>
              {product.getName()}
              {product.deletedAt && (
                <small className="deleted-badge">{t("DELETED_BADGE")}</small>
              )}
            </>
          }
          quantity={item.getQuantity()}
          amount={
            <Price price={item.getAmount()} isDeductionItem={deduction} />
          }
          selected={selected}
          deduction={deduction}
          busy={compactLines.busy}
          onSelect={() => onClick(item)}
          onEdit={
            item.getIsQuantityChangable()
              ? () => onDoubleClick(item)
              : undefined
          }
          onRemove={() => compactLines.onRemove(item)}
        />
      );
    }
    return (
      <TransactionItem
        key={key}
        isDiscountItem={deduction}
        transactionItem={item}
        isActiveTransactionItem={selected}
        onClick={() => onClick(item)}
        onDoubleClick={() => onDoubleClick(item)}
      />
    );
  };
  return (
    <div>
      <div
        className={`transaction-columns${compactLines ? " pos-compact-line" : ""}`}
        aria-hidden="true"
      >
        <span>{t("UI_QTY")}</span>
        <span>{t("UI_ITEM")}</span>
        <span>{t("UI_AMOUNT")}</span>
      </div>
      <div className="transaction-items-container">
        {productItems.map((item, index) => renderItem(item, index, false))}
        {discountItems.map((item, index) => renderItem(item, index, true))}
      </div>
      <div className="transaction-details">
        <span>{TOTAL}</span>
        <Price price={total}></Price>
      </div>
    </div>
  );
};

export default TransactionsItemsContainer;
