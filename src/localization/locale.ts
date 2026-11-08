import english from "../data/Text_EN.json";
import nepali from "../data/Text_Nepali.json";

import {
  createLocaleMessages,
  translateMessage,
  interpolateLocaleText,
  englishMessages,
  LocaleKey,
  LocaleMessages,
} from "./messages";
export type { LocaleKey, LocaleMessages } from "./messages";
import { requiredParameters, TextParameters } from "./interpolation";
export type { TextParameters } from "./interpolation";
export type Translate = (key: LocaleKey, parameters?: TextParameters) => string;
export type LocaleSelection = "english" | "nepali" | "custom";
export interface LocaleState {
  selection: LocaleSelection;
  custom: Partial<LocaleMessages> | null;
  messages: LocaleMessages;
}
const STORAGE_KEY = "pos.locale";
const UPDATE_EVENT = "locale:updated";

export function rt(
  text: string,
  parameters: TextParameters = {},
  messages: LocaleMessages = state.messages,
) {
  return interpolateLocaleText(text, parameters, messages);
}

export class LocaleValidationError extends Error {
  constructor(
    public readonly key: LocaleKey,
    public readonly parameters: TextParameters = {},
  ) {
    super(key);
  }
}
/** Validate provided entries; omitted keys inherit English, including future additions. */
export function validateCustomLocale(value: unknown): Partial<LocaleMessages> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new LocaleValidationError("LOCALE_FILE_OBJECT");
  const custom: Partial<LocaleMessages> = {};
  const source = english as Record<string, unknown>;
  const candidate = { ...source, ...(value as Record<string, unknown>) };
  const lookup = (dictionary: Record<string, unknown>) => (key: string) => {
    const text = Object.prototype.hasOwnProperty.call(dictionary, key)
      ? dictionary[key]
      : undefined;
    return typeof text === "string" && text.trim() ? text : undefined;
  };

  for (const key of Object.keys(english) as (keyof typeof english)[]) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const translated = (value as Record<string, unknown>)[key];
    if (typeof translated !== "string" || !translated.trim())
      throw new LocaleValidationError("LOCALE_VALUE_INVALID", { key });
    const expected = requiredParameters(
      lookup(source)(key) ?? key,
      lookup(source),
      new Set([key]),
    );
    if (
      JSON.stringify(
        requiredParameters(translated, lookup(candidate), new Set([key])),
      ) !== JSON.stringify(expected)
    ) {
      throw new LocaleValidationError("LOCALE_PLACEHOLDER_INVALID", {
        key,
        placeholders:
          expected.join(", ") || englishMessages.LOCALE_NO_PLACEHOLDERS,
      });
    }
    custom[key] = translated;
  }
  if (!Object.keys(custom).length)
    throw new LocaleValidationError("LOCALE_NO_ENTRIES");
  return custom;
}

function resolveMessages(
  selection: LocaleSelection,
  custom: Partial<LocaleMessages> | null,
): LocaleMessages {
  if (selection === "nepali")
    return createLocaleMessages({ ...english, ...nepali });
  if (selection === "custom")
    return createLocaleMessages({ ...english, ...custom });
  return englishMessages;
}

function readState(): LocaleState {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    );
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const saved = raw as Record<string, unknown>;
      const custom = saved.custom ? validateCustomLocale(saved.custom) : null;
      const selection: LocaleSelection =
        saved.selection === "nepali"
          ? "nepali"
          : saved.selection === "custom" && custom
            ? "custom"
            : "english";
      return {
        selection,
        custom,
        messages: resolveMessages(selection, custom),
      };
    }
  } catch {
    /* Invalid or unavailable saved language preferences fall back to English. */
  }
  return { selection: "english", custom: null, messages: englishMessages };
}
let state = readState();
export const getLocaleState = () => state;
export const getLocaleText: Translate = (key, parameters = {}) =>
  translateMessage(state.messages, key, parameters);

/** Persist before notifying React and non-React consumers of the new language. */
function saveState(
  selection: LocaleSelection,
  custom: Partial<LocaleMessages> | null,
) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ selection, custom }));
  state = { selection, custom, messages: resolveMessages(selection, custom) };
  window.dispatchEvent(new Event(UPDATE_EVENT));
}
export function saveCustomLocale(custom: Partial<LocaleMessages>) {
  saveState(state.selection, validateCustomLocale(custom));
}
export function selectLocale(selection: LocaleSelection) {
  if (selection === "custom" && !state.custom)
    throw new LocaleValidationError("LOCALE_NO_CUSTOM");
  saveState(selection, state.custom);
}
export function subscribeLocale(listener: () => void) {
  const changed = () => listener();
  const storageChanged = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      state = readState();
      listener();
    }
  };
  window.addEventListener(UPDATE_EVENT, changed);
  window.addEventListener("storage", storageChanged);
  return () => {
    window.removeEventListener(UPDATE_EVENT, changed);
    window.removeEventListener("storage", storageChanged);
  };
}
