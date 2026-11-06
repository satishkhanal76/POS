import { useCallback, useState } from "react";
import { MdAdd } from "react-icons/md";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { PageOptions } from "../../database/Pagination";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import useListFilter from "../../hooks/useListFilter";
import usePagedQuery from "../../hooks/usePagedQuery";
import { IProductItem } from "../../models/ProductItem";
import ItemAddForm from "../Items/ItemAddForm";
import ItemEditForm from "../Items/ItemEditForm";
import ItemsView from "../Items/ItemsView";
import PageHeader from "../Layout/PageHeader";
import DeletedVisibility from "../utils/DeletedVisibility";
import PaginationControls from "../utils/PaginationControls";
import "../Forms/ListFilters.css";

export default function ItemsPage() {
  const t = useLocaleText(),
    { itemOS } = useDatabase(),
    { includeDeleted } = useDeletedVisibility();
  const revision = useDeletionRevision(),
    [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useListFilter("search", "");
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<IProductItem | null>(null);
  const reload = () => setRefresh((value) => value + 1);
  const query = useCallback(
    (options: PageOptions) => {
      void revision;
      void refresh;
      return itemOS.getCatalogPage({ ...options, includeDeleted }, search);
    },
    [itemOS, includeDeleted, search, revision, refresh],
  );
  const pagination = usePagedQuery(query, "items");
  return (
    <main>
      {adding && (
        <ItemAddForm
          onClose={() => setAdding(false)}
          onAddItem={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
      {editing && (
        <ItemEditForm
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      <PageHeader
        title={t("ITEMS_TITLE")}
        actions={
          <button
            type="button"
            className="page-add-button"
            onClick={() => setAdding(true)}
            aria-label={t("ITEM_FORM_TITLE")}
          >
            <MdAdd aria-hidden="true" />
          </button>
        }
      />
      <DeletedVisibility />
      <label className="list-filter">
        {t("SEARCH_ITEMS")}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <PaginationControls
        showSort={false}
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
        <ItemsView
          onDeleted={reload}
          onEdit={setEditing}
          handleDelete={() => {}}
          items={pagination.result?.rows ?? []}
        />
      )}
    </main>
  );
}
