import { ReactNode } from "react";
import { MdClose } from "react-icons/md";
import OrderShortcut from "./OrderShortcut";
import CompactOrderLine from "./CompactOrderLine";
import {
  PurchaseOrderLine,
  purchaseLineTotal,
  purchaseOrderTotal,
} from "../../purchasing/order";
import { useLocaleText } from "../../contexts/Locale";
import Price from "../Items/Price";
import "../Transaction/TransactionView.css";
export default function PurchaseOrderView({
  lines,
  selected,
  onSelect,
  onEdit,
  supplier,
  onClearSupplier,
  date,
  reference,
  onAdd,
  disabled = false,
  compact,
}: {
  lines: PurchaseOrderLine[];
  selected: string | null;
  onSelect: (id: string) => void;
  onEdit: (line: PurchaseOrderLine) => void;
  supplier: string;
  onClearSupplier: () => void;
  date: string;
  reference: string;
  onAdd: () => void;
  disabled?: boolean;
  compact?: {
    onRemove: (id: string) => void;
    add: ReactNode;
    emptyAdd: ReactNode;
    emptySupplier?: ReactNode;
    payment: ReactNode;
    footer: ReactNode;
  };
}) {
  const t = useLocaleText();
  return (
    <div className="transaction-container">
      <header className="transaction-title">
        <div>
          <h2>{t("UI_CURRENT_ORDER")}</h2>
          <span className="transaction-item-count">
            {t("BUY_PURCHASE_MODE")} · {date} · {reference}
          </span>
        </div>
        <div className="pos-order-heading-actions">
          <span className="transaction-item-count">
            {t(
              lines.length === 1
                ? "TRANSACTION_ITEM_COUNT_ONE"
                : "TRANSACTION_ITEM_COUNT_OTHER",
              { count: lines.length },
            )}
          </span>
          {lines.length > 0 && compact?.add}
        </div>
      </header>
      <div className="purchase-order-meta">
        <span>{supplier || t("ORDER_SELECT_SUPPLIER")}</span>
        {supplier && (
          <OrderShortcut
            action={{
              children: t("ORDER_CLEAR_SUPPLIER"),
              onClick: onClearSupplier,
            }}
            icon={<MdClose />}
            busy={disabled}
          />
        )}
        {!lines.length && compact?.emptySupplier}
      </div>
      {!lines.length ? (
        <div className="pos-empty-state">
          <h3>{t("ORDER_START_PURCHASE")}</h3>
          <p>{t("ORDER_PURCHASE_HELP")}</p>
          {compact ? (
            <div className="pos-shortcut-group pos-empty-shortcuts">
              {compact.emptyAdd}
              {compact.payment}
            </div>
          ) : (
            <button
              type="button"
              className="pos-start-button"
              disabled={disabled}
              onClick={onAdd}
            >
              {t("UI_ADD_YOUR_FIRST_ITEM")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={`transaction-columns${compact ? " pos-compact-line" : ""}`}
            aria-hidden="true"
          >
            <span>{t("UI_QTY")}</span>
            <span>{t("UI_ITEM")}</span>
            <span>{t("UI_AMOUNT")}</span>
          </div>
          <div className="transaction-items-container">
            {lines.map((line) => {
              const name = (
                <>
                  {line.name}
                  <small className="purchase-unit-cost">
                    {t("BUY_UNIT_COST")}: <Price price={line.unitCost} />
                  </small>
                </>
              );
              const amount = <Price price={purchaseLineTotal(line)} />;
              if (compact)
                return (
                  <CompactOrderLine
                    key={line.id}
                    name={name}
                    label={line.name}
                    quantity={line.quantity}
                    amount={amount}
                    selected={line.id === selected}
                    busy={disabled}
                    onSelect={() => onSelect(line.id)}
                    onEdit={() => onEdit(line)}
                    onRemove={() => compact.onRemove(line.id)}
                  />
                );
              return (
                <button
                  type="button"
                  key={line.id}
                  disabled={disabled}
                  className={`transaction-item purchase-order-line${line.id === selected ? " active" : ""}`}
                  aria-pressed={line.id === selected}
                  onClick={() => onSelect(line.id)}
                  onDoubleClick={() => onEdit(line)}
                >
                  <span className="quantity">{line.quantity}</span>
                  <span className="name">{name}</span>
                  {amount}
                </button>
              );
            })}
          </div>
        </>
      )}
      <footer className="transaction-details">
        <span>{t("TOTAL")}</span>
        <Price price={purchaseOrderTotal(lines)} />
      </footer>
      {lines.length > 0 && compact?.footer}
    </div>
  );
}
