import english from "../data/Text_EN.json";
import nepali from "../data/Text_Nepali.json";
import { createLocaleMessages, getObservedMissingKeys } from "./messages";
import { LocaleSelection } from "./locale";

export interface MissingTranslation {
  key: string;
  english: string | null;
  display: string;
  fallback: "english" | "key";
  reason: "missing" | "empty" | "invalid";
}

/** Inspect raw dictionaries, not their resolved fallbacks, so gaps remain visible. */
export function auditTranslations(
  selection: LocaleSelection,
  custom: Record<string, unknown> | null = null,
  dictionaries: {
    english?: Record<string, unknown>;
    nepali?: Record<string, unknown>;
    keys?: readonly string[];
    observedKeys?: readonly string[];
  } = {},
): MissingTranslation[] {
  const baseEnglish: Record<string, unknown> = dictionaries.english ?? english;
  const baseNepali: Record<string, unknown> = dictionaries.nepali ?? nepali;
  const source =
    selection === "english"
      ? baseEnglish
      : selection === "nepali"
        ? baseNepali
        : (custom ?? {});
  const resolved = createLocaleMessages(
    { ...baseEnglish, ...source },
    baseEnglish,
  );
  const keys = new Set([
    ...(dictionaries.keys ?? []),
    ...Object.keys(baseEnglish),
    ...Object.keys(baseNepali),
    ...Object.keys(custom ?? {}),
    ...(dictionaries.observedKeys ?? getObservedMissingKeys()),
  ]);
  return [...keys].sort().flatMap((key) => {
    const present = Object.prototype.hasOwnProperty.call(source, key);
    const value = present ? source[key] : undefined;
    if (typeof value === "string" && value.trim()) return [];
    const reference = Object.prototype.hasOwnProperty.call(baseEnglish, key)
      ? baseEnglish[key]
      : undefined;
    const englishText =
      typeof reference === "string" && reference.trim() ? reference : null;
    const usesEnglish = selection !== "english" && englishText !== null;
    return [
      {
        key,
        english: englishText,
        display: usesEnglish ? resolved[key] : key,
        fallback: usesEnglish ? ("english" as const) : ("key" as const),
        reason: !present
          ? ("missing" as const)
          : typeof value === "string"
            ? ("empty" as const)
            : ("invalid" as const),
      },
    ];
  });
}
