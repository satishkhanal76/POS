import { useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import FullScreenModal from "../Modals/FullScreenModal";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import { IProductItem } from "../../models/ProductItem";
import "../Customer/CustomForm.css";
export default function ItemAddForm({
  onClose,
  onAddItem,
}: {
  onClose: () => void;
  onAddItem?: (item: IProductItem) => void;
}) {
  const t = useLocaleText(),
    { itemOS } = useDatabase();
  const [name, setName] = useState(""),
    [price, setPrice] = useState(""),
    [canSell, setCanSell] = useState(true),
    [canPurchase, setCanPurchase] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <FullScreenModal
      title={t("ITEM_FORM_TITLE")}
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
          setBusy(true);
          setError("");
          try {
            if (canSell && !price.trim())
              throw new Error(t("UI_ENTER_A_PRICE"));
            const item = await new ItemsController(itemOS).handleFormSubmit({
              name,
              price: canSell ? Number(price) : 0,
              canSell,
              canPurchase,
            });
            if (item) onAddItem?.(item);
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : t("BUY_INVALID"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("INPUT_ITEM_NAME_LABEL")}
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          {t("INPUT_ITEM_PRICE_LABEL")}
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={busy || !canSell}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={canSell}
            onChange={(event) => setCanSell(event.target.checked)}
            disabled={busy}
          />
          {t("BUY_CAN_SELL")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={canPurchase}
            onChange={(event) => setCanPurchase(event.target.checked)}
            disabled={busy}
          />
          {t("BUY_CAN_PURCHASE")}
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="workspace-buttons">
          <button type="submit" disabled={busy}>
            {t(busy ? "UI_SAVING" : "INPUT_FORM_SUBMIT_BUTTON")}
          </button>
          <button type="button" onClick={onClose} disabled={busy}>
            {t("UI_CANCEL")}
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
}
