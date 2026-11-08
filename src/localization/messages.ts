import {
  interpolateText,
  MessageLookup,
  TextParameters,
} from "./interpolation";
import english from "../data/Text_EN.json";

// Keys stay open so removing a dictionary entry does not prevent the app from building.
export type LocaleKey = string;
export type LocaleMessages = Record<LocaleKey, string>;
const lookups = new WeakMap<object, MessageLookup>();
const observedMissingKeys = new Set<string>();
export const getObservedMissingKeys = () => [...observedMissingKeys];

/** Support both t(key) and legacy text.KEY lookups, without inventing export entries. */
export function createLocaleMessages(
  messages: Record<string, unknown>,
  fallback: Record<string, unknown> = english,
): LocaleMessages {
  if (lookups.has(messages)) return messages as LocaleMessages;
  const valueFor = (source: Record<string, unknown>, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(source, key)
      ? source[key]
      : undefined;
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  const lookup: MessageLookup = (key) =>
    valueFor(messages, key) ?? valueFor(fallback, key);
  const result = new Proxy(messages, {
    get(target, key, receiver) {
      if (typeof key !== "string") return Reflect.get(target, key, receiver);
      const value = lookup(key);
      if (value !== undefined)
        return interpolateText(value, {}, lookup, new Set([key]));
      if (/^[A-Z][A-Z0-9_]*$/.test(key)) observedMissingKeys.add(key);
      return key;
    },
  }) as LocaleMessages;
  lookups.set(result, lookup);
  return result;
}

// Also safe in build tools and the startup screen, before browser preferences exist.
export const englishMessages = createLocaleMessages(english);

/** Translation functions read raw templates so explicit parameters win over references. */
export function translateMessage(
  messages: LocaleMessages,
  key: string,
  parameters: TextParameters = {},
) {
  const dictionary = createLocaleMessages(messages);
  const lookup = lookups.get(dictionary)!;
  const template = lookup(key);
  if (template === undefined) return dictionary[key];
  return interpolateText(template, parameters, lookup, new Set([key]));
}

export function interpolateLocaleText(
  text: string,
  parameters: TextParameters,
  messages: LocaleMessages,
) {
  const dictionary = createLocaleMessages(messages);
  return interpolateText(text, parameters, lookups.get(dictionary)!);
}
