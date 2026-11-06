import { useEffect, useRef, useState } from "react";
import { IContact } from "../../models/Contact";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import { dateInput, dashboardRange } from "../../dashboard/period";
import PurchasingController from "../../controllers/PurchasingController";
import FullScreenModal from "../Modals/FullScreenModal";
import Select from "../Forms/Select";
import DateInput from "../Forms/DateInput";
import "../Customer/CustomForm.css";
import "../Workspace/Workspace.css";
export default function SupplierPaymentForm({
  contactId = "",
  initialReference = "",
  initialAmount,
  onClose,
  onSaved,
}: {
  contactId?: string;
  initialReference?: string;
  initialAmount?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useLocaleText(),
    stores = useDatabase(),
    { notify } = useNotifications(),
    [contacts, setContacts] = useState<IContact[]>([]),
    [contact, setContact] = useState(contactId),
    [date, setDate] = useState(() => dateInput(new Date())),
    [reference, setReference] = useState(initialReference),
    [amount, setAmount] = useState(() =>
      initialAmount === undefined ? "" : String(initialAmount),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void stores.contactOS
      .getAll()
      .then((rows) => {
        if (!cancelled) setContacts(rows);
      })
      .catch(() => {
        if (!cancelled) setError(t("BUY_SAVE_FAILED"));
      });
    return () => {
      cancelled = true;
    };
  }, [stores, t]);
  return (
    <FullScreenModal
      title={t("BUY_PAY")}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form
        className="custom-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            const range = dashboardRange("day", date, date);
            if (!range || !contact || !amount.trim())
              throw new Error(t("BUY_INVALID"));
            const postedAt = new Date(range.start),
              now = new Date();
            postedAt.setHours(
              now.getHours(),
              now.getMinutes(),
              now.getSeconds(),
              now.getMilliseconds(),
            );
            await new PurchasingController(stores.purchasingOS).pay(
              contact,
              Number(amount),
              postedAt.getTime(),
              reference,
            );
            onSaved();
            notify(t("BUY_SAVED"));
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : t("BUY_SAVE_FAILED"),
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <label>
          {t("CONTACT_NAME")}
          <Select value={contact} disabled={busy} onChange={setContact}>
            <option value="">{t("BUY_CHOOSE_CONTACT")}</option>
            {contacts.map((person) => (
              <option key={person.getId()} value={person.getId()}>
                {person.getName()}
              </option>
            ))}
          </Select>
        </label>
        <label>
          {t("BUY_AMOUNT_PAID")}
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            disabled={busy}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          {t("DASH_DATE")}
          <DateInput value={date} onChange={setDate} />
        </label>
        <label>
          {t("BUY_REFERENCE")}
          <input
            className="input"
            value={reference}
            disabled={busy}
            onChange={(event) => setReference(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="workspace-buttons">
          <button type="submit" disabled={busy}>
            {t(busy ? "UI_SAVING" : "BUY_SAVE_PAYMENT")}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            {t("UI_CANCEL")}
          </button>
        </div>
      </form>
    </FullScreenModal>
  );
}
