import { useClientGlobal } from "../../contexts/ClientGlobal";
import { useLocaleText } from "../../contexts/Locale";
import { useState } from "react";
import FullScreenModal from "../Modals/FullScreenModal";
import { IProductItem } from "../../models/ProductItem";
import ItemsController from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import "../Customer/CustomForm.css";

interface ItemEditFormProps {
  item: IProductItem;
  onClose: () => void;
  onSaved: () => void;
}
export default function ItemEditForm({
  item,
  onClose,
  onSaved,
}: ItemEditFormProps) {
  const { sales } = useClientGlobal();
  const t = useLocaleText();
  const { itemOS } = useDatabase();
  const [name, setName] = useState(item.getName());
  const [price, setPrice] = useState(
    item.canSell === 0 ? "" : String(item.getAmount()),
  );
  const [canSell, setCanSell] = useState(item.canSell !== 0);
  const [canPurchase, setCanPurchase] = useState(item.canPurchase !== 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <FullScreenModal
      title={t("UI_EDIT_ITEM")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="custom-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (
              (sales && canSell && !price.trim()) ||
              (!canSell && !canPurchase)
            )
              throw new Error(t("UI_ENTER_A_PRICE"));
            await new ItemsController(itemOS).updateItem(
              item.getId(),
              name,
              sales && canSell ? Number(price) : undefined,
              {
                ...(sales ? { canSell: canSell ? 1 : 0 } : {}),
                canPurchase: canPurchase ? 1 : 0,
              },
            );
            onSaved();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : t("UI_UNABLE_TO_SAVE_ITEM"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {sales && (
          <p>
            {t(
              "UI_PRICE_CHANGES_TAKE_EFFECT_NOW_PREVIOUS_TRANSACTIONS_KEEP_THE",
            )}
          </p>
        )}
        <div className="input-container">
          <label htmlFor="edit-item-name">{t("INPUT_ITEM_NAME_LABEL")}</label>
          <input
            className="input"
            id="edit-item-name"
            value={name}
            required
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {sales && (
          <>
            <div className="input-container">
              <label htmlFor="edit-item-price">{t("UI_CURRENT_PRICE")}</label>
              <input
                className="input"
                id="edit-item-price"
                type="number"
                min="0"
                step="any"
                value={price}
                required={canSell}
                disabled={busy || !canSell}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={canSell}
                onChange={(event) => setCanSell(event.target.checked)}
                disabled={busy}
              />
              {t("BUY_CAN_SELL")}
            </label>
          </>
        )}
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
            {busy ? t("UI_SAVING") : t("UI_SAVE_CHANGES")}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            {t("UI_CANCEL")}
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
}
