import type { LocaleKey } from "../localization/locale";
import type { DashboardPeriod } from "../dashboard/period";
import type { PageSort } from "../database/Pagination";

const purchaseSortOptions = [
  { value: "newest", label: "PAGINATION_NEWEST" },
  { value: "oldest", label: "PAGINATION_OLDEST" },
  { value: "total-high", label: "SORT_TOTAL_HIGH" },
  { value: "total-low", label: "SORT_TOTAL_LOW" },
] as const satisfies readonly { value: PageSort; label: LocaleKey }[];

export const salesSortOptions = [
  ...purchaseSortOptions,
  { value: "items-high", label: "SORT_ITEMS_HIGH" },
  { value: "items-low", label: "SORT_ITEMS_LOW" },
] as const satisfies readonly { value: PageSort; label: LocaleKey }[];

export { purchaseSortOptions };
export const salesSorts = salesSortOptions.map(({ value }) => value);
export const purchaseSorts = purchaseSortOptions.map(({ value }) => value);

export type HistoryPeriod = Exclude<DashboardPeriod, "custom">;
export type SalesSort = (typeof salesSortOptions)[number]["value"];
export type PurchaseSort = (typeof purchaseSortOptions)[number]["value"];
export type SalesFilter = "all" | "sale" | "payment";
export type PurchaseFilter = "all" | "purchase" | "supplier-payment";
