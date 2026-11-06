import { validQuantity } from "../../validators/QuantityValidator";
import { useMemo, useState } from "react";
import { IProductItem } from "../../models/ProductItem";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import StockController from "../../controllers/StockController";
import FullScreenModal from "../Modals/FullScreenModal";
import "../Customer/CustomForm.css";
import "../Workspace/Workspace.css";

export default function StockForm({
  item,
  count,
  onClose,
}: {
  item: IProductItem;
  count: number;
  onClose: () => void;
}) {
  const t = useLocaleText();
  const { notify } = useNotifications();
  const { stockOS } = useDatabase();
  const controller = useMemo(() => new StockController(stockOS), [stockOS]);
  const [value, setValue] = useState(String(count));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <FullScreenModal
      title={t("STOCK_EDIT_TITLE", { item: item.getName() })}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="custom-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          if (!value.trim() || !validQuantity(Number(value), true)) {
            setError(t("STOCK_INVALID"));
            return;
          }
          setBusy(true);
          setError("");
          try {
            await controller.setCount(item.getId(), Number(value));
            onClose();
            notify(t("STOCK_SAVED", { item: item.getName() }));
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : t("STOCK_SAVE_FAILED"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>{t("STOCK_EDIT_HELP")}</p>
        <label htmlFor="stock-count">{t("STOCK_IN_STOCK")}</label>
        <input
          className="input"
          id="stock-count"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.001"
          value={value}
          disabled={busy}
          aria-invalid={!!error}
          onChange={(event) => setValue(event.target.value)}
        />
        {error && <p role="alert">{error}</p>}
        <div className="workspace-buttons">
          <button type="submit" disabled={busy}>
            {t(busy ? "UI_SAVING" : "UI_SAVE_CHANGES")}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            {t("UI_CANCEL")}
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
}
