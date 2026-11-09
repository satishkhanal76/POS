import { isThemePreference, ThemePreference } from "./theme";
import { SETTINGS_STORAGE_KEY } from "./storage";
import { getLocaleText, LocaleKey, Translate } from "../contexts/Locale";
import defaults from "../data/ClientGlobal.json";

import { pageSizes, PageSize } from "../database/Pagination";
import {
  HistoryPeriod,
  PurchaseFilter,
  PurchaseSort,
  purchaseSortOptions,
  SalesFilter,
  SalesSort,
  salesSortOptions,
} from "./history";

import type { BalanceFilter } from "../database/CustomerBalancesOS";

type ItemRanking = "quantity" | "gross";

export type Settings = Omit<typeof defaults, "theme"> & {
  historyPeriod: HistoryPeriod;
  historyPageSize: `${PageSize}`;
  salesSort: SalesSort;
  salesFilter: SalesFilter;
  purchaseSort: PurchaseSort;
  purchaseFilter: PurchaseFilter;
  dashboardPeriod: HistoryPeriod;
  dashboardPageSize: `${PageSize}`;
  dashboardSalesSort: SalesSort;
  dashboardSalesFilter: SalesFilter;
  dashboardPurchaseSort: PurchaseSort;
  dashboardPurchaseFilter: PurchaseFilter;
  dashboardItemRanking: ItemRanking;
  dashboardStartCollapsed: boolean;
  overviewPeriod: HistoryPeriod;
  overviewPageSize: `${PageSize}`;
  overviewItemRanking: ItemRanking;
  overviewCustomerFilter: BalanceFilter;
  overviewSupplierFilter: BalanceFilter;
  overviewStartCollapsed: boolean;
  theme: ThemePreference;
};
type Field<K extends keyof Settings> = {
  key: K;
  label: LocaleKey;
  description: LocaleKey;
  group:
    | "Prices"
    | "Appearance"
    | "Stock"
    | "Deletion"
    | "Purchasing"
    | "Order"
    | "History"
    | "Dashboard"
    | "Overview";
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
} & (K extends
  | "theme"
  | "historyPeriod"
  | "historyPageSize"
  | "salesSort"
  | "salesFilter"
  | "purchaseSort"
  | "purchaseFilter"
  | "dashboardPeriod"
  | "dashboardPageSize"
  | "dashboardSalesSort"
  | "dashboardSalesFilter"
  | "dashboardPurchaseSort"
  | "dashboardPurchaseFilter"
  | "dashboardItemRanking"
  | "overviewPeriod"
  | "overviewPageSize"
  | "overviewItemRanking"
  | "overviewCustomerFilter"
  | "overviewSupplierFilter"
  ? {
      type: "select";
      options: readonly { value: Settings[K]; label?: LocaleKey }[];
      invalid: LocaleKey;
    }
  : {
      type: Settings[K] extends boolean
        ? "boolean"
        : Settings[K] extends number
          ? "number"
          : "text";
    });
export type SettingField = { [K in keyof Settings]: Field<K> }[keyof Settings];

const periodOptions = [
  { value: "day", label: "DASH_DAY" },
  { value: "week", label: "DASH_WEEK" },
  { value: "month", label: "DASH_MONTH" },
  { value: "year", label: "DASH_YEAR" },
  { value: "all", label: "REPORT_ALL_TIME" },
] as const;

const pageSizeOptions = pageSizes.map((size) => ({
  value: `${size}` as const,
  label: size === 0 ? ("REPORT_ALL" as const) : undefined,
}));

const salesFilterOptions = [
  { value: "all", label: "FILTER_ALL_TYPES" },
  { value: "sale", label: "PAYMENT_SALE" },
  { value: "payment", label: "REPORT_PAYMENTS" },
] as const;

const purchaseFilterOptions = [
  { value: "all", label: "FILTER_ALL_TYPES" },
  { value: "purchase", label: "BUY_PURCHASE" },
  { value: "supplier-payment", label: "BUY_PAYMENTS" },
] as const;

const itemRankingOptions = [
  { value: "quantity", label: "DASH_UNITS" },
  { value: "gross", label: "DASH_ITEM_VALUE" },
] as const;
const customerBalanceOptions = [
  { value: "owing", label: "DASH_OWING" },
  { value: "settled", label: "DASH_SETTLED" },
  { value: "credit", label: "DASH_CREDIT" },
  { value: "all", label: "DASH_ALL_CUSTOMERS" },
] as const;
const supplierBalanceOptions = [
  { value: "owing", label: "SUPPLIER_FILTER_OWING" },
  { value: "credit", label: "SUPPLIER_FILTER_CREDIT" },
  { value: "settled", label: "SUPPLIER_FILTER_SETTLED" },
  { value: "all", label: "REPORT_ALL" },
] as const;

export const settingsSchema: SettingField[] = [
  {
    key: "pickerPageSize",
    type: "number",
    label: "PICKER_LIMIT",
    description: "PICKER_LIMIT_HELP",
    group: "Order",
    min: 1,
    max: 50,
    integer: true,
  },
  {
    key: "pickerRecentFirst",
    type: "boolean",
    label: "PICKER_RECENT",
    description: "PICKER_RECENT_HELP",
    group: "Order",
  },
  {
    key: "sales",
    type: "boolean",
    label: "SALES_ENABLE",
    description: "SALES_ENABLE_HELP",
    group: "Purchasing",
  },
  {
    key: "purchasing",
    type: "boolean",
    label: "BUY_ENABLE",
    description: "BUY_ENABLE_HELP",
    group: "Purchasing",
  },
  {
    key: "showSoftDeletedToggle",
    type: "boolean",
    label: "DELETED_SETTING",
    description: "DELETED_SETTING_HELP",
    group: "Deletion",
  },
  {
    key: "stockManagement",
    type: "boolean",
    label: "STOCK_ENABLE",
    description: "STOCK_ENABLE_HELP",
    group: "Stock",
  },
  {
    key: "forceStockAdherence",
    type: "boolean",
    label: "STOCK_FORCE",
    description: "STOCK_FORCE_HELP",
    group: "Stock",
  },
  {
    key: "currencyCharacter",
    type: "text",
    label: "UI_CURRENCY_SYMBOL",
    description: "UI_USE_A_SYMBOL_OR_CODE_SUCH_AS_CA_OR",
    group: "Prices",
    maxLength: 12,
  },
  {
    key: "numOfDecimalPlaces",
    type: "number",
    label: "UI_DECIMAL_PLACES",
    description: "UI_NUMBER_OF_DIGITS_DISPLAYED_AFTER_THE_DECIMAL_POINT",
    group: "Prices",
    min: 0,
    max: 6,
    integer: true,
  },
  {
    key: "compactUI",
    type: "boolean",
    label: "SETTINGS_COMPACT_UI",
    description: "SETTINGS_COMPACT_UI_HELP",
    group: "Appearance",
  },
  {
    key: "compactOtherViews",
    type: "boolean",
    label: "SETTINGS_COMPACT_OTHER_VIEWS",
    description: "SETTINGS_COMPACT_OTHER_VIEWS_HELP",
    group: "Appearance",
  },
  {
    key: "showOrderActions",
    type: "boolean",
    label: "SETTINGS_SHOW_ORDER_ACTIONS",
    description: "SETTINGS_SHOW_ORDER_ACTIONS_HELP",
    group: "Appearance",
  },
  {
    key: "theme",
    type: "select",
    label: "SETTINGS_THEME",
    description: "SETTINGS_THEME_HELP",
    options: [
      { value: "system", label: "SETTINGS_THEME_SYSTEM" },
      { value: "light", label: "SETTINGS_THEME_LIGHT" },
      { value: "dark", label: "SETTINGS_THEME_DARK" },
    ],
    invalid: "SETTINGS_THEME_INVALID",
    group: "Appearance",
  },
  {
    key: "historyPeriod",
    type: "select",
    label: "SETTINGS_HISTORY_PERIOD",
    description: "SETTINGS_HISTORY_PERIOD_HELP",
    options: periodOptions,
    invalid: "SETTINGS_HISTORY_PERIOD_INVALID",
    group: "History",
  },
  {
    key: "historyPageSize",
    type: "select",
    label: "SETTINGS_HISTORY_PAGE_SIZE",
    description: "SETTINGS_HISTORY_PAGE_SIZE_HELP",
    options: pageSizeOptions,
    invalid: "VALIDATION_REQUIRED",
    group: "History",
  },
  {
    key: "salesSort",
    type: "select",
    label: "SETTINGS_SALES_SORT",
    description: "SETTINGS_SALES_SORT_HELP",
    options: salesSortOptions,
    invalid: "VALIDATION_REQUIRED",
    group: "History",
  },
  {
    key: "salesFilter",
    type: "select",
    label: "SETTINGS_SALES_FILTER",
    description: "SETTINGS_SALES_FILTER_HELP",
    options: salesFilterOptions,
    invalid: "VALIDATION_REQUIRED",
    group: "History",
  },
  {
    key: "purchaseSort",
    type: "select",
    label: "SETTINGS_PURCHASE_SORT",
    description: "SETTINGS_PURCHASE_SORT_HELP",
    options: purchaseSortOptions,
    invalid: "VALIDATION_REQUIRED",
    group: "History",
  },
  {
    key: "purchaseFilter",
    type: "select",
    label: "SETTINGS_PURCHASE_FILTER",
    description: "SETTINGS_PURCHASE_FILTER_HELP",
    options: purchaseFilterOptions,
    invalid: "VALIDATION_REQUIRED",
    group: "History",
  },
  {
    key: "dashboardPeriod",
    type: "select",
    label: "SETTINGS_HISTORY_PERIOD",
    description: "SETTINGS_REPORT_PERIOD_HELP",
    group: "Dashboard",
    options: periodOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardPageSize",
    type: "select",
    label: "SETTINGS_HISTORY_PAGE_SIZE",
    description: "SETTINGS_REPORT_PAGE_SIZE_HELP",
    group: "Dashboard",
    options: pageSizeOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardSalesSort",
    type: "select",
    label: "SETTINGS_SALES_SORT",
    description: "SETTINGS_SALES_SORT_HELP",
    group: "Dashboard",
    options: salesSortOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardSalesFilter",
    type: "select",
    label: "SETTINGS_SALES_FILTER",
    description: "SETTINGS_SALES_FILTER_HELP",
    group: "Dashboard",
    options: salesFilterOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardPurchaseSort",
    type: "select",
    label: "SETTINGS_PURCHASE_SORT",
    description: "SETTINGS_PURCHASE_SORT_HELP",
    group: "Dashboard",
    options: purchaseSortOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardPurchaseFilter",
    type: "select",
    label: "SETTINGS_PURCHASE_FILTER",
    description: "SETTINGS_PURCHASE_FILTER_HELP",
    group: "Dashboard",
    options: purchaseFilterOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardItemRanking",
    type: "select",
    label: "SETTINGS_ITEM_RANKING",
    description: "SETTINGS_ITEM_RANKING_HELP",
    group: "Dashboard",
    options: itemRankingOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "dashboardStartCollapsed",
    type: "boolean",
    label: "SETTINGS_REPORT_COLLAPSED",
    description: "SETTINGS_REPORT_COLLAPSED_HELP",
    group: "Dashboard",
  },
  {
    key: "overviewPeriod",
    type: "select",
    label: "SETTINGS_HISTORY_PERIOD",
    description: "SETTINGS_REPORT_PERIOD_HELP",
    group: "Overview",
    options: periodOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "overviewPageSize",
    type: "select",
    label: "SETTINGS_HISTORY_PAGE_SIZE",
    description: "SETTINGS_REPORT_PAGE_SIZE_HELP",
    group: "Overview",
    options: pageSizeOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "overviewItemRanking",
    type: "select",
    label: "SETTINGS_ITEM_RANKING",
    description: "SETTINGS_ITEM_RANKING_HELP",
    group: "Overview",
    options: itemRankingOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "overviewCustomerFilter",
    type: "select",
    label: "SETTINGS_CUSTOMER_BALANCE_FILTER",
    description: "SETTINGS_BALANCE_FILTER_HELP",
    group: "Overview",
    options: customerBalanceOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "overviewSupplierFilter",
    type: "select",
    label: "SETTINGS_SUPPLIER_BALANCE_FILTER",
    description: "SETTINGS_BALANCE_FILTER_HELP",
    group: "Overview",
    options: supplierBalanceOptions,
    invalid: "VALIDATION_REQUIRED",
  },
  {
    key: "overviewStartCollapsed",
    type: "boolean",
    label: "SETTINGS_REPORT_COLLAPSED",
    description: "SETTINGS_REPORT_COLLAPSED_HELP",
    group: "Overview",
  },
];
export const defaultSettings: Settings = {
  ...defaults,
  historyPeriod: "month",
  historyPageSize: "10",
  salesSort: "newest",
  salesFilter: "all",
  purchaseSort: "newest",
  purchaseFilter: "all",
  dashboardPeriod: "day",
  dashboardPageSize: "10",
  dashboardSalesSort: "newest",
  dashboardSalesFilter: "all",
  dashboardPurchaseSort: "newest",
  dashboardPurchaseFilter: "all",
  dashboardItemRanking: "quantity",
  dashboardStartCollapsed: true,
  overviewPeriod: "month",
  overviewPageSize: "10",
  overviewItemRanking: "quantity",
  overviewCustomerFilter: "owing",
  overviewSupplierFilter: "owing",
  overviewStartCollapsed: true,
  theme: isThemePreference(defaults.theme) ? defaults.theme : "system",
};
export function getDeviceDefaults(): Settings {
  // Match the breakpoint where the POS switches to a single-column layout.
  const compactUI =
    typeof window !== "undefined" &&
    window.matchMedia?.("(max-width: 800px)").matches;
  return {
    ...defaultSettings,
    compactUI: compactUI ?? defaultSettings.compactUI,
  };
}

export const STORAGE_KEY = SETTINGS_STORAGE_KEY;
export const UPDATE_EVENT = "clientGlobal:updated";
export type SettingsDraft = Record<keyof Settings, string | boolean>;
export const toDraft = (settings: Settings): SettingsDraft =>
  Object.fromEntries(
    settingsSchema.map((field) => [
      field.key,
      field.type === "boolean"
        ? settings[field.key]
        : String(settings[field.key]),
    ]),
  ) as SettingsDraft;

export function fieldError(
  field: SettingField,
  value: unknown,
  t: Translate = getLocaleText,
): string | undefined {
  if (field.type === "select")
    return field.options.some((option) => option.value === value)
      ? undefined
      : t(field.invalid);
  if (field.type === "boolean")
    return typeof value === "boolean" ? undefined : t("UI_CHOOSE_ON_OR_OFF");
  if (field.type === "text") {
    if (typeof value !== "string" || !value.trim())
      return t("VALIDATION_REQUIRED");
    if (field.maxLength && value.trim().length > field.maxLength)
      return t("UI_USE_AT_MOST_VALUE_CHARACTERS", { value0: field.maxLength });
    return;
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(number)) return t("UI_ENTER_A_VALID_NUMBER");
  if (field.integer && !Number.isInteger(number))
    return t("UI_ENTER_A_WHOLE_NUMBER");
  if (
    (field.min !== undefined && number < field.min) ||
    (field.max !== undefined && number > field.max)
  )
    return t("UI_ENTER_A_NUMBER_BETWEEN_VALUE_AND_VALUE", {
      value0: field.min,
      value1: field.max,
    });
}

export function orderModeError(
  settings: Pick<SettingsDraft, "sales" | "purchasing">,
  t: Translate = getLocaleText,
) {
  return !settings.sales && !settings.purchasing
    ? t("ORDER_MODE_REQUIRED")
    : undefined;
}

export function parseDraft(draft: SettingsDraft): Settings {
  const next = { ...defaultSettings };
  for (const field of settingsSchema) {
    const value = draft[field.key];
    const error = fieldError(field, value);
    if (error)
      throw new Error(
        getLocaleText("VALIDATION_FIELD_ERROR", {
          field: getLocaleText(field.label),
          error,
        }),
      );
    Object.assign(next, {
      [field.key]:
        field.type === "number"
          ? Number(value)
          : field.type === "text"
            ? String(value).trim()
            : value,
    });
  }
  const error = orderModeError(next);
  if (error) throw new Error(error);
  return next;
}

export function loadSettings(): Settings {
  const next = getDeviceDefaults();
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return next;
    const stored = parsed as Record<string, unknown>;
    // The old light value was also the default, so only a legacy dark selection is carried forward.
    if (!isThemePreference(stored.theme) && stored.darkMode === true)
      next.theme = "dark";
    for (const field of settingsSchema) {
      const value = stored[field.key];
      const expected = typeof defaultSettings[field.key];
      if (typeof value === expected && !fieldError(field, value))
        Object.assign(next, {
          [field.key]: typeof value === "string" ? value.trim() : value,
        });
    }
  } catch {
    /* Missing or unreadable storage falls back to validated defaults. */
  }
  if (!next.sales && !next.purchasing) next.sales = defaultSettings.sales;
  return next;
}

export function saveSettings(draft: SettingsDraft): Settings {
  const next = parseDraft(draft);
  // Notify consumers only after persistence succeeds.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
  return next;
}
