import { IContact } from "../../models/Contact";
import { useLocaleText } from "../../contexts/Locale";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import DeleteRecordButton from "../utils/DeleteRecordButton";
export default function ContactsTable({
  contacts,
  onOpen,
  onEdit,
  onDeleted,
}: {
  contacts: IContact[];
  onOpen: (contact: IContact) => void;
  onEdit: (contact: IContact) => void;
  onDeleted: () => void;
}) {
  const t = useLocaleText();
  const columns: CustomTableColumn<IContact>[] = [
    {
      key: "name",
      header: t("CONTACT_NAME"),
      render: (contact) => contact.getName(),
    },
    {
      key: "phone",
      header: t("INPUT_CUSTOMER_PHONE_LABEL"),
      render: (contact) => contact.getPhoneNumber(),
    },
    {
      key: "actions",
      header: t("UI_ACTIONS"),
      variant: "actions",
      render: (contact) => (
        <>
          <button type="button" onClick={() => onEdit(contact)}>
            {t("UI_EDIT")}
          </button>
          <DeleteRecordButton
            table="CUSTOMER"
            id={contact.getId()}
            name={contact.getName()}
            deleted={!!contact.deletedAt}
            onDeleted={onDeleted}
          />
        </>
      ),
    },
  ];
  return (
    <CustomTableView
      label={t("CUSTOMERS_TITLE")}
      emptyTitle={t("UI_NO_CUSTOMERS_YET")}
      data={contacts}
      columns={columns}
      rowKey={(contact) => contact.getId()}
      onRowClick={onOpen}
    />
  );
}
