import { useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { parseQuantity } from "../../validators/QuantityValidator";
import { PurchaseOrderLine, purchaseLineTotal } from "../../purchasing/order";
import FullScreenModal from "../Modals/FullScreenModal";
import Price from "../Items/Price";
import "../Customer/CustomForm.css";
import "../Workspace/Workspace.css";
export default function PurchaseLineForm({
  line,
  onClose,
  onSave,
  needsCost = false,
}: {
  line: PurchaseOrderLine;
  onClose: () => void;
  onSave: (line: PurchaseOrderLine) => void;
  needsCost?: boolean;
}) {
  const t = useLocaleText();
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [cost, setCost] = useState(needsCost ? "" : String(line.unitCost));
  const [error, setError] = useState("");
  const preview = purchaseLineTotal({
    ...line,
    quantity: Number(quantity),
    unitCost: Number(cost),
  });
  return (
    <FullScreenModal title={line.name} onClose={onClose}>
      <form
        className="custom-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const amount = Number(cost);
            if (
              !cost.trim() ||
              !Number.isFinite(amount) ||
              amount < 0 ||
              !Number.isSafeInteger(Math.round(amount * 100)) ||
              Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
            )
              throw new Error(t("BUY_INVALID"));
            onSave({
              ...line,
              quantity: parseQuantity(quantity),
              unitCost: amount,
            });
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : t("BUY_INVALID"),
            );
          }
        }}
      >
        <p>{t("ORDER_BUY_COST_HELP")}</p>
        <label>
          {t("BUY_UNIT_COST")}
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
        </label>
        <label>
          {t("QUANTITY_LABEL")}
          <input
            className="input"
            type="number"
            min="0.001"
            step="0.001"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <div className="form-preview">
          <span>{t("QUANTITY_LINE_TOTAL")}</span>
          <Price price={Number.isFinite(preview) ? preview : 0} />
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="workspace-buttons">
          <button type="submit">{t("ORDER_APPLY_LINE")}</button>
          <button type="button" onClick={onClose}>
            {t("UI_CANCEL")}
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
}
