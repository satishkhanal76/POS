import { useLocaleText } from "../../contexts/Locale";
import { ReactNode, useId, useState } from "react";
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
  title?: string;
  searchPlaceholderText?: string;
}

export default function SearchableModal({
  title,
  searchPlaceholderText,
  handleAdd,
  onClose,
  items,
}: SearchableModalProps) {
  const t = useLocaleText();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const text = useLocale();
  const matches = items.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <FullScreenModal
      title={title || text.SEARCH_MODAL_DEFAULT_TITLE}
      onClose={onClose}
    >
      <div className="modal-search-container">
        <MdSearch aria-hidden="true" />
        <label className="modal-visually-hidden" htmlFor={searchId}>
          {t("UI_SEARCH_BY_NAME")}
        </label>
        <input
          id={searchId}
          placeholder={
            searchPlaceholderText || text.SEARCH_BOX_DEFAULT_PLACEHOLDER
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="modal-search"
          type="search"
          autoComplete="off"
        />
      </div>
      <p className="modal-result-count" role="status">
        {t(
          matches.length === 1
            ? "SEARCH_RESULT_COUNT_ONE"
            : "SEARCH_RESULT_COUNT_OTHER",
          { count: matches.length },
        )}
      </p>
      <div className="modal-items-container">
        {matches.map((item) => (
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
        {!matches.length && (
          <div className="modal-empty">
            <MdSearch aria-hidden="true" />
            <h3>
              {items.length
                ? t("UI_NO_MATCHES_FOUND")
                : t("UI_NOTHING_TO_SELECT_YET")}
            </h3>
            <p>
              {items.length
                ? t("UI_TRY_ANOTHER_NAME_OR_CLEAR_YOUR_SEARCH")
                : t("UI_ADD_ITEMS_OR_CUSTOMERS_FROM_MANAGE_THEN_RETURN_HERE")}
            </p>
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}
