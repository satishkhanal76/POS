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
  date,
  reference,
  onAdd,
  disabled = false,
}: {
  lines: PurchaseOrderLine[];
  selected: string | null;
  onSelect: (id: string) => void;
  onEdit: (line: PurchaseOrderLine) => void;
  supplier: string;
  date: string;
  reference: string;
  onAdd: () => void;
  disabled?: boolean;
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
        <span className="transaction-item-count">
          {t("TRANSACTION_ITEM_COUNT_OTHER", { count: lines.length })}
        </span>
      </header>
      <div className="purchase-order-meta">
        {supplier || t("ORDER_SELECT_SUPPLIER")}
      </div>
      {!lines.length ? (
        <div className="pos-empty-state">
          <h3>{t("ORDER_START_PURCHASE")}</h3>
          <p>{t("ORDER_PURCHASE_HELP")}</p>
          <button
            type="button"
            className="pos-start-button"
            disabled={disabled}
            onClick={onAdd}
          >
            {t("UI_ADD_YOUR_FIRST_ITEM")}
          </button>
        </div>
      ) : (
        <>
          <div className="transaction-columns" aria-hidden="true">
            <span>{t("UI_QTY")}</span>
            <span>{t("UI_ITEM")}</span>
            <span>{t("UI_AMOUNT")}</span>
          </div>
          <div className="transaction-items-container">
            {lines.map((line) => (
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
                <span className="name">
                  {line.name}
                  <small className="purchase-unit-cost">
                    {t("BUY_UNIT_COST")}: <Price price={line.unitCost} />
                  </small>
                </span>
                <Price price={purchaseLineTotal(line)} />
              </button>
            ))}
          </div>
        </>
      )}
      <footer className="transaction-details">
        <span>{t("TOTAL")}</span>
        <Price price={purchaseOrderTotal(lines)} />
      </footer>
    </div>
  );
}
