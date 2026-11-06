import { useRef, useState } from "react";
import { IContact } from "../../models/Contact";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import ContactController from "../../controllers/ContactController";
import FullScreenModal from "../Modals/FullScreenModal";
import "../Customer/CustomForm.css";
export default function ContactForm({
  contact,
  onClose,
  onSaved,
}: {
  contact?: IContact;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useLocaleText(),
    { contactOS } = useDatabase(),
    [name, setName] = useState(contact?.getName() ?? ""),
    [phone, setPhone] = useState(contact?.getPhoneNumber() ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    lock = useRef(false);
  return (
    <FullScreenModal
      title={t(contact ? "UI_EDIT_CUSTOMER" : "CUSTOMER_FORM_TITLE")}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form
        className="custom-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            const controller = new ContactController(contactOS);
            if (contact)
              await controller.updateContact(contact.getId(), {
                name,
                phoneNumber: phone,
              });
            else
              await controller.handleFormSubmit({ name, phoneNumber: phone });
            onSaved();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : t("UI_UNABLE_TO_SAVE_CUSTOMER"),
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <label>
          {t("INPUT_CUSTOMER_NAME_LABEL")}
          <input
            className="input"
            value={name}
            required
            autoComplete="name"
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          {t("INPUT_CUSTOMER_PHONE_LABEL")}
          <input
            className="input"
            type="tel"
            autoComplete="tel"
            value={phone}
            disabled={busy}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
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
