import { useLocaleText } from "../../contexts/Locale";
import { useState } from "react";
import { ICustomer } from "../../models/Customer";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomerController from "../../controllers/CustomerController";
import FullScreenModal from "../Modals/FullScreenModal";
import "./CustomForm.css";
import "../Workspace/Workspace.css";

interface CustomerEditFormProps {
  customer: ICustomer;
  onClose: () => void;
  onSaved: (customer: ICustomer) => void;
}

export default function CustomerEditForm({
  customer,
  onClose,
  onSaved,
}: CustomerEditFormProps) {
  const t = useLocaleText();
  const { customerOS } = useDatabase();
  const [name, setName] = useState(customer.getName());
  const [phoneNumber, setPhoneNumber] = useState(customer.getPhoneNumber());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <FullScreenModal
      title={t("UI_EDIT_CUSTOMER")}
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
            const updated = await new CustomerController(
              customerOS,
            ).updateCustomer(customer.getId(), { name, phoneNumber });
            onSaved(updated);
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : t("UI_UNABLE_TO_SAVE_CUSTOMER"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          {t(
            "UI_UPDATE_THIS_CUSTOMER_S_DETAILS_THEIR_EXISTING_TRANSACTIONS_STAY",
          )}
        </p>
        <div className="input-container">
          <label htmlFor="edit-customer-name">
            {t("INPUT_CUSTOMER_NAME_LABEL")}
          </label>
          <input
            className="input"
            id="edit-customer-name"
            autoComplete="name"
            required
            disabled={busy}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="input-container">
          <label htmlFor="edit-customer-phone">
            {t("INPUT_CUSTOMER_PHONE_LABEL")}
          </label>
          <input
            className="input"
            id="edit-customer-phone"
            type="tel"
            autoComplete="tel"
            disabled={busy}
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </div>
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
