import { isThemePreference, ThemePreference } from "./theme";
import { SETTINGS_STORAGE_KEY } from "./storage";
import { getLocaleText, LocaleKey, Translate } from "../contexts/Locale";
import defaults from "../data/ClientGlobal.json";

export type Settings = Omit<typeof defaults, "theme"> & {
  theme: ThemePreference;
};
type Field<K extends keyof Settings> = {
  key: K;
  type: K extends "theme"
    ? "select"
    : Settings[K] extends boolean
      ? "boolean"
      : Settings[K] extends number
        ? "number"
        : "text";
  label: LocaleKey;
  description: LocaleKey;
  group:
    "Prices" | "Appearance" | "Stock" | "Deletion" | "Purchasing" | "Order";
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
};
export type SettingField = { [K in keyof Settings]: Field<K> }[keyof Settings];

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
    key: "theme",
    type: "select",
    label: "SETTINGS_THEME",
    description: "SETTINGS_THEME_HELP",
    group: "Appearance",
  },
];
export const defaultSettings: Settings = {
  ...defaults,
  theme: isThemePreference(defaults.theme) ? defaults.theme : "system",
};
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
    return isThemePreference(value) ? undefined : t("SETTINGS_THEME_INVALID");
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
  const next = { ...defaultSettings };
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
