import { useClientGlobal } from "../../contexts/ClientGlobal";
import { nameSortOptions } from "../utils/catalogSorts";
import CatalogSearch from "../Forms/CatalogSearch";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdAdd } from "react-icons/md";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { PageOptions } from "../../database/Pagination";
import { IContact } from "../../models/Contact";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import useListFilter from "../../hooks/useListFilter";
import usePagedQuery from "../../hooks/usePagedQuery";
import PageHeader from "../Layout/PageHeader";
import DeletedVisibility from "../utils/DeletedVisibility";
import PaginationControls from "../utils/PaginationControls";
import ContactForm from "../Contacts/ContactForm";
import ContactsTable from "../Contacts/ContactsTable";

export default function ContactsPage() {
  const { sales, purchasing } = useClientGlobal();
  const t = useLocaleText(),
    { contactOS } = useDatabase(),
    { includeDeleted } = useDeletedVisibility(),
    navigate = useNavigate(),
    location = useLocation();
  const revision = useDeletionRevision(),
    [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<IContact | null>(null),
    [open, setOpen] = useState(false);
  const [search, setSearch] = useListFilter("search", "");
  const reload = () => setRefresh((value) => value + 1);
  const query = useCallback(
    (options: PageOptions) => {
      void revision;
      void refresh;
      return contactOS.getCatalogPage({ ...options, includeDeleted }, search);
    },
    [contactOS, includeDeleted, search, revision, refresh],
  );
  const pagination = usePagedQuery(
    query,
    "contacts",
    "name-asc",
    nameSortOptions.map((option) => option.value),
  );
  return (
    <main>
      <PageHeader
        title={t("CUSTOMERS_TITLE")}
        description={sales && purchasing ? t("CONTACT_ROLE_HELP") : undefined}
        actions={
          <button
            type="button"
            className="page-add-button"
            aria-label={t("CUSTOMER_FORM_TITLE")}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <MdAdd aria-hidden="true" />
          </button>
        }
      />
      <DeletedVisibility />
      <PaginationControls
        className="catalog-toolbar"
        sortOptions={nameSortOptions}
        filters={
          <CatalogSearch
            label={t("SEARCH_CONTACTS")}
            placeholder={t("SEARCH_CONTACTS_PLACEHOLDER")}
            value={search}
            onChange={setSearch}
          />
        }

        page={pagination.page}
        pageSize={pagination.pageSize}
        sort={pagination.sort}
        total={pagination.result?.total ?? 0}
        busy={pagination.loading}
        onChange={pagination.change}
      />
      {pagination.error ? (
        <p role="alert">{t("PAGINATION_ERROR")}</p>
      ) : pagination.loading ? (
        <p role="status">{t("PAGINATION_LOADING")}</p>
      ) : (
        <ContactsTable
          contacts={pagination.result?.rows ?? []}
          onOpen={(contact) =>
            navigate(
              `/contact?id=${encodeURIComponent(contact.getId())}${includeDeleted ? "&deleted=1" : ""}`,
              { state: { returnTo: location.pathname + location.search } },
            )
          }
          onEdit={(contact) => {
            setEditing(contact);
            setOpen(true);
          }}
          onDeleted={reload}
        />
      )}
      {open && (
        <ContactForm
          contact={editing ?? undefined}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </main>
  );
}
