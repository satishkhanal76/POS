import ItemsPrintButton from "../Items/ItemsPrintButton";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import { STOCK_UPDATED } from "../../stock/events";
import { itemSortOptions } from "../utils/catalogSorts";
import CatalogSearch from "../Forms/CatalogSearch";
import { useCallback, useEffect, useState } from "react";
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
  const { stockManagement } = useClientGlobal();
  const sorts = itemSortOptions(stockManagement);
  const pagination = usePagedQuery(query, 'items', 'name-asc', sorts.map(option => option.value));
  useEffect(() => {
    if (!stockManagement) return;
    const update = () => setRefresh(value => value + 1);
    window.addEventListener(STOCK_UPDATED, update);
    return () => window.removeEventListener(STOCK_UPDATED, update);
  }, [stockManagement]);
  return (
    <main className="items-page">
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
        actions={<>
          <ItemsPrintButton items={pagination.result?.rows ?? []} page={pagination.page} includeDeleted={includeDeleted} disabled={pagination.loading || pagination.error}/>
          <button
            type="button"
            className="page-add-button"
            onClick={() => setAdding(true)}
            aria-label={t("ITEM_FORM_TITLE")}
          >
            <MdAdd aria-hidden="true" />
          </button>
        </>}
      />
      <DeletedVisibility />
      <PaginationControls
        className="catalog-toolbar"
        sortOptions={sorts}
        filters={<CatalogSearch label={t('SEARCH_ITEMS')} placeholder={t('SEARCH_ITEMS_PLACEHOLDER')} value={search} onChange={setSearch}/>}

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
