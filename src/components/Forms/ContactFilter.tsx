import { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import Select from "./Select";
import CustomerSelectionModal from "../Modals/CustomerSelectionModal";

export default function ContactFilter({
  value,
  onChange,
  membership = false,
  purchase = false,
}: {
  value: string;
  onChange: (value: string) => void;
  membership?: boolean;
  purchase?: boolean;
}) {
  const t = useLocaleText();
  const { contactOS } = useDatabase();
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState<{ id: string; name: string } | null>(
    null,
  );
  const specific =
    value !== "all" && (!membership || !["linked", "unlinked"].includes(value));
  useEffect(() => {
    if (!specific) return;
    let cancelled = false;
    void contactOS
      .getOne(value, true)
      .then((contact) => {
        if (!cancelled) setPerson({ id: value, name: contact.getName() });
      })
      .catch(() => {
        if (!cancelled) setPerson(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contactOS, value, specific]);
  return (
    <>
      <label className="pagination-field">
        {t("CONTACT_NAME")}
        <Select
          aria-label={t("CONTACT_NAME")}
          value={value}
          onChange={(next) =>
            next === "choose" ? setOpen(true) : onChange(next)
          }
        >
          <option value="all">
            {t(purchase ? "PURCHASE_CONTACT_ALL" : "TRANSACTION_CONTACT_ALL")}
          </option>
          {membership && (
            <>
              <option value="linked">{t("TRANSACTION_CONTACT_LINKED")}</option>
              <option value="unlinked">
                {t("TRANSACTION_CONTACT_UNLINKED")}
              </option>
            </>
          )}
          {specific && (
            <option value={value}>
              {person?.id === value ? person.name : t("CONTACT_NAME")}
            </option>
          )}
          <option value="choose">{t("TRANSACTION_CONTACT_CHOOSE")}</option>
        </Select>
      </label>
      <CustomerSelectionModal
        purchase={purchase}
        isModalOpen={open}
        onClose={() => setOpen(false)}
        handleAddItem={(contact) => {
          if (!contact) return;
          setPerson({ id: contact.getId(), name: contact.getName() });
          onChange(contact.getId());
          setOpen(false);
        }}
      />
    </>
  );
}
