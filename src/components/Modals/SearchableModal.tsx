import { useLocaleText } from "../../contexts/Locale";
import { ReactNode, useId } from "react";
import { MdSearch, MdArrowForward } from "react-icons/md";
import FullScreenModal from "./FullScreenModal";
import { useLocale } from "../../contexts/Locale";
import "./SearchableModal.css";

export interface ISearchableItem {
  id: string;
  name: string;
  children: ReactNode;
}
interface SearchableModalProps {
  handleAdd: (item: ISearchableItem) => void;
  onClose: () => void;
  items: ISearchableItem[];
  query: string;
  onQueryChange: (query: string) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  recentFirst: boolean;
  searchLabel?: string;
  title?: string;
  searchPlaceholderText?: string;
}

export default function SearchableModal({
  title,
  searchPlaceholderText,
  handleAdd,
  onClose,
  items, query, onQueryChange, loading, loadingMore, hasMore, error, onLoadMore, onRetry, recentFirst, searchLabel,
}: SearchableModalProps) {
  const t = useLocaleText();
  const searchId = useId();
  const text = useLocale();
  return (
    <FullScreenModal
      title={title || text.SEARCH_MODAL_DEFAULT_TITLE}
      onClose={onClose}
    >
      <div className="modal-search-container">
        <MdSearch aria-hidden="true" />
        <label className="modal-visually-hidden" htmlFor={searchId}>
          {searchLabel ?? t("UI_SEARCH_BY_NAME")}
        </label>
        <input
          id={searchId}
          placeholder={
            searchPlaceholderText || text.SEARCH_BOX_DEFAULT_PLACEHOLDER
          }
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="modal-search"
          type="search"
          autoComplete="off"
        />
      </div>
      <p className="modal-result-count" role="status">{loading ? t('PAGINATION_LOADING') : t('PICKER_SHOWN', { count: items.length })}</p>
      {!query.trim() && recentFirst && <p className="modal-picker-hint">{t('PICKER_SUGGESTIONS_HELP')}</p>}
      {error && <div className="modal-picker-error" role="alert"><p>{t('PICKER_ERROR')}</p><button type="button" onClick={onRetry}>{t('PICKER_RETRY')}</button></div>}
      <div className="modal-items-container">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className="modal-item"
            onClick={() => handleAdd(item)}
          >
            <span className="modal-item-details">{item.children}</span>
            <MdArrowForward className="modal-item-arrow" aria-hidden="true" />
          </button>
        ))}
        {!loading && !error && !items.length && (
          <div className="modal-empty">
            <MdSearch aria-hidden="true" />
            <h3>
              {query.trim()
                ? t("UI_NO_MATCHES_FOUND")
                : t("UI_NOTHING_TO_SELECT_YET")}
            </h3>
            <p>
              {query.trim()
                ? t("UI_TRY_ANOTHER_NAME_OR_CLEAR_YOUR_SEARCH")
                : t("UI_ADD_ITEMS_OR_CUSTOMERS_FROM_MANAGE_THEN_RETURN_HERE")}
            </p>
          </div>
        )}
      </div>
      {hasMore && <div className="modal-picker-footer"><button type="button" disabled={loadingMore} onClick={onLoadMore}>{t(loadingMore ? 'PAGINATION_LOADING' : 'PICKER_MORE')}</button></div>}
    </FullScreenModal>
  );
}
