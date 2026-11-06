import { useCallback, useEffect, useState } from "react";
import useDeletedVisibility from "../../hooks/useDeletedVisibility";
import useDeletionRevision from "../../hooks/useDeletionRevision";
import usePagedQuery from "../../hooks/usePagedQuery";
import useListFilter from "../../hooks/useListFilter";
import DeletedVisibility from "../utils/DeletedVisibility";
import Select from "../Forms/Select";
import { useLocaleText } from "../../contexts/Locale";
import { useDatabase } from "../../contexts/DatabaseContext";
import { PriceHistoryEntry } from "../../controllers/PriceHistoryController";
import { PageOptions } from "../../database/Pagination";
import PageHeader from "../Layout/PageHeader";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import PaginationControls from "../utils/PaginationControls";
import Price from "../Items/Price";
import "./PriceHistoryPage.css";

export default function PriceHistoryPage() {
  const t = useLocaleText(),
    { includeDeleted } = useDeletedVisibility(),
    revision = useDeletionRevision();
  const { itemOS, itemPriceChangesOS } = useDatabase();
  const [items, setItems] = useState<{ id: string; name: string }[]>([]),
    [choicesError, setChoicesError] = useState(false);
  const [itemId, setItemId] = useListFilter("item", "");
  useEffect(() => {
    let cancelled = false;
    setChoicesError(false);
    void itemOS
      .getNameChoices(includeDeleted)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setChoicesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [itemOS, includeDeleted, revision]);
  const query = useCallback(
    (options: PageOptions) => {
      void revision;
      return itemPriceChangesOS.getHistoryPage(
        { ...options, includeDeleted },
        itemId || undefined,
      );
    },
    [itemPriceChangesOS, includeDeleted, itemId, revision],
  );
  const pagination = usePagedQuery(query, "prices");
  const columns: CustomTableColumn<PriceHistoryEntry>[] = [
    { key: "item", header: t("UI_ITEM"), render: (entry) => entry.itemName },
    {
      key: "previous",
      header: t("UI_PREVIOUS_PRICE"),
      variant: "numeric",
      render: (entry) => <Price price={entry.previousAmount} />,
    },
    {
      key: "new",
      header: t("UI_NEW_PRICE"),
      variant: "numeric",
      render: (entry) => <Price price={entry.amount} />,
    },
    {
      key: "date",
      header: t("UI_EFFECTIVE_DATE"),
      render: (entry) => (
        <time dateTime={new Date(entry.timestamp).toISOString()}>
          {new Date(entry.timestamp).toLocaleString()}
        </time>
      ),
    },
  ];
  return (
    <main>
      <PageHeader
        title={t("NAVBAR_PRICE_HISTORY")}
        description={t(
          "UI_REVIEW_ITEM_PRICE_CHANGES_NEWEST_FIRST_ITEM_NAMES_REFLECT",
        )}
      />
      <DeletedVisibility />
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        sort={pagination.sort}
        total={pagination.result?.total ?? 0}
        busy={pagination.loading}
        onChange={pagination.change}
        filters={
          <label className="pagination-field">
            {t("UI_FILTER_BY_ITEM")}
            <Select value={itemId} onChange={setItemId}>
              <option value="">{t("UI_ALL_ITEMS")}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
        }
      />
      {pagination.error || choicesError ? (
        <p role="alert">
          {t("UI_PRICE_HISTORY_COULD_NOT_BE_LOADED_RELOAD_THE_PAGE")}
        </p>
      ) : pagination.loading ? (
        <p role="status">{t("UI_LOADING_PRICE_HISTORY")}</p>
      ) : (
        <CustomTableView
          label={t("UI_PRICE_HISTORY")}
          columns={columns}
          data={pagination.result?.rows ?? []}
          rowKey={(entry) => entry.id}
          emptyTitle={t("UI_NO_PRICE_CHANGES_YET")}
          emptyDescription={t("UI_EDIT_AN_ITEM_S_PRICE_FROM_MANAGE_ITEMS_ITS")}
        />
      )}
    </main>
  );
}
