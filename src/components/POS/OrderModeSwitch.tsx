import { MdShoppingCart, MdInventory2 } from "react-icons/md";
import { useLocaleText } from "../../contexts/Locale";
import "./OrderModeSwitch.css";
export type OrderMode = "sale" | "purchase";
export default function OrderModeSwitch({
  mode,
  onChange,
  disabled,
}: {
  mode: OrderMode;
  onChange: (mode: OrderMode) => void;
  disabled: boolean;
}) {
  const t = useLocaleText();
  return (
    <div className="order-mode-control">
      <div className="order-mode-heading">
        <span>{t("ORDER_MODE")}</span>
        <div
          className="order-mode-switch"
          role="group"
          aria-label={t("ORDER_MODE")}
        >
          <button
            type="button"
            aria-pressed={mode === "sale"}
            disabled={disabled}
            onClick={() => onChange("sale")}
          >
            <MdShoppingCart aria-hidden="true" />
            {t("PAYMENT_SALE")}
          </button>
          <button
            type="button"
            className="purchase-mode"
            aria-pressed={mode === "purchase"}
            disabled={disabled}
            onClick={() => onChange("purchase")}
          >
            <MdInventory2 aria-hidden="true" />
            {t("BUY_PURCHASE_MODE")}
          </button>
        </div>
      </div>
      <p>{t("ORDER_MODE_HELP")}</p>
    </div>
  );
}
