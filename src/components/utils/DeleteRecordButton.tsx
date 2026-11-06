import { MdOutlineDelete } from "react-icons/md";
import "./DeleteRecordButton.css";
import { useMemo, useRef, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import DeletionStore from "../../database/DeletionStore";
import FullScreenModal from "../Modals/FullScreenModal";
import "../Workspace/Workspace.css";

export default function DeleteRecordButton({
  table,
  id,
  name,
  deleted,
  onDeleted,
  variant = "table",
}: {
  table:
    | "PRODUCTS"
    | "CUSTOMER"
    | "TRANSACTIONS"
    | "PURCHASES"
    | "SUPPLIER_PAYMENTS";
  id: string;
  name: string;
  deleted?: boolean;
  onDeleted?: () => void;
  variant?: "table" | "standalone";
}) {
  const t = useLocaleText();
  const { database } = useDatabase();
  const { notify } = useNotifications();
  const store = useMemo(() => new DeletionStore(database), [database]);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const close = () => {
    if (!lock.current) {
      setOpen(false);
      setTyped("");
      setError("");
    }
  };
  return (
    <span
      className="delete-record-control"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={
          variant === "standalone" ? "record-delete-action" : "table-delete"
        }
        aria-label={t(deleted ? "DELETE_HARD_LABEL" : "UI_DELETE_VALUE", {
          value0: name,
        })}
        onClick={() => setOpen(true)}
      >
        {variant === "standalone" && <MdOutlineDelete aria-hidden="true" />}
        {t(deleted ? "DELETE_HARD" : "ITEM_DELETE_BUTTON")}
      </button>
      {open && (
        <FullScreenModal
          title={t(deleted ? "DELETE_HARD" : "DELETE_SOFT_TITLE")}
          onClose={close}
        >
          <p>
            {t(
              deleted
                ? "DELETE_HARD_WARNING"
                : table === "TRANSACTIONS"
                  ? "DELETE_SALE_WARNING"
                  : table === "PURCHASES" || table === "SUPPLIER_PAYMENTS"
                    ? "BUY_DELETE_WARNING"
                    : "DELETE_SOFT_WARNING",
              { name },
            )}
          </p>
          {deleted && (
            <p>
              {t(
                table === "PRODUCTS"
                  ? "DELETE_ITEM_CASCADE"
                  : table === "CUSTOMER"
                    ? "DELETE_CUSTOMER_CASCADE"
                    : table === "PURCHASES" || table === "SUPPLIER_PAYMENTS"
                      ? "BUY_HARD_WARNING"
                      : "DELETE_TRANSACTION_CASCADE",
              )}
            </p>
          )}
          {table === "TRANSACTIONS" && <p>{t("DELETE_STOCK_NOTE")}</p>}
          {deleted && (
            <label className="database-reset-input">
              {t("DELETE_TYPE", { name })}
              <input
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={busy}
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="workspace-buttons">
            <button
              type="button"
              disabled={busy || (!!deleted && typed !== name)}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  await store.delete(table, id, !!deleted);
                  setOpen(false);
                  onDeleted?.();
                  notify(t("DELETE_DONE"));
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : t("DELETE_FAILED"),
                  );
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              {t(
                busy
                  ? "UI_WORKING"
                  : deleted
                    ? "DELETE_HARD_CONFIRM"
                    : "DELETE_SOFT_CONFIRM",
              )}
            </button>
            <button type="button" disabled={busy} onClick={close}>
              {t("UI_CANCEL")}
            </button>
          </div>
        </FullScreenModal>
      )}
    </span>
  );
}
