/* eslint-disable react-refresh/only-export-components -- The locale context intentionally shares its provider, hooks, and compatibility helpers. */
import {
  createLocaleMessages,
  translateMessage,
} from "../localization/messages";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getLocaleState,
  subscribeLocale,
  LocaleMessages,
  Translate,
} from "../localization/locale";

// Preserve the existing import API for feature components and controllers.
export { getLocaleText, rt } from "../localization/locale";
export type {
  LocaleKey,
  LocaleMessages,
  Translate,
} from "../localization/locale";
export const LocaleContext = createContext<LocaleMessages>(
  getLocaleState().messages,
);

export function useLocale() {
  const messages = useContext(LocaleContext);
  return useMemo(() => createLocaleMessages(messages), [messages]);
}
export function useLocalePreferences() {
  return useSyncExternalStore(subscribeLocale, getLocaleState, getLocaleState);
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const state = useLocalePreferences();
  useEffect(() => {
    document.title = state.messages.PWA_APP_NAME;
    document.documentElement.lang = state.selection === "nepali" ? "ne" : "en";
  }, [state.messages, state.selection]);
  return (
    <LocaleContext.Provider value={state.messages}>
      {children}
    </LocaleContext.Provider>
  );
}
export function useLocaleText(): Translate {
  const messages = useLocale();
  return useCallback(
    (key, parameters = {}) => translateMessage(messages, key, parameters),
    [messages],
  );
}
