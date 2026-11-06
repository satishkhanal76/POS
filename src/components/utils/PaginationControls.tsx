import Select from "../Forms/Select";
import { ReactNode, useId } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { PageOptions, PageSort } from "../../database/Pagination";
import "./PaginationControls.css";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  sort: PageOptions["sort"];
  total: number;
  busy: boolean;
  onChange: (changes: Partial<PageOptions>) => void;
  showSort?: boolean;
  extraSorts?: boolean;
  itemSorts?: boolean;
  filters?: ReactNode;
}
export default function PaginationControls({
  page,
  pageSize,
  sort,
  total,
  busy,
  onChange,
  showSort = true,
  extraSorts = false,
  itemSorts = true,
  filters,
}: PaginationControlsProps) {
  const t = useLocaleText();
  const id = useId();
  const effectiveSize = pageSize || Math.max(1, total);
  const pageCount = Math.max(1, Math.ceil(total / effectiveSize));
  return (
    <div className="pagination-controls">
      <div className="pagination-options">
        {filters}
        {showSort && (
          <div className="pagination-field">
            <label htmlFor={`${id}-sort`}>{t("PAGINATION_SORT")}</label>
            <Select
              id={`${id}-sort`}
              value={sort}
              onChange={(value) => onChange({ sort: value as PageSort })}
            >
              <option value="newest">{t("PAGINATION_NEWEST")}</option>
              <option value="oldest">{t("PAGINATION_OLDEST")}</option>
              {extraSorts && (
                <>
                  <option value="total-high">{t("SORT_TOTAL_HIGH")}</option>
                  <option value="total-low">{t("SORT_TOTAL_LOW")}</option>
                  {itemSorts && (
                    <>
                      <option value="items-high">{t("SORT_ITEMS_HIGH")}</option>
                      <option value="items-low">{t("SORT_ITEMS_LOW")}</option>
                    </>
                  )}
                </>
              )}
            </Select>
          </div>
        )}
        <div className="pagination-field">
          <label htmlFor={`${id}-size`}>{t("PAGINATION_PAGE_SIZE")}</label>
          <Select
            id={`${id}-size`}
            value={pageSize}
            onChange={(value) => onChange({ pageSize: Number(value) })}
          >
            <option value={0}>{t("REPORT_ALL")}</option>
            {[10, 25, 50, 100].map((size) => (
              <option value={size} key={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="pagination-navigation">
        <span role="status">
          {busy
            ? t("PAGINATION_LOADING")
            : t("PAGINATION_RANGE", {
                start: total ? (page - 1) * effectiveSize + 1 : 0,
                end: Math.min(page * effectiveSize, total),
                total,
              })}
        </span>
        <button
          type="button"
          disabled={busy || page <= 1}
          onClick={() => onChange({ page: page - 1 })}
        >
          {t("PAGINATION_PREVIOUS")}
        </button>
        <span>
          {!busy && t("PAGINATION_PAGE_NUMBER", { page, pages: pageCount })}
        </span>
        <button
          type="button"
          disabled={busy || page >= pageCount}
          onClick={() => onChange({ page: page + 1 })}
        >
          {t("PAGINATION_NEXT")}
        </button>
      </div>
    </div>
  );
}
