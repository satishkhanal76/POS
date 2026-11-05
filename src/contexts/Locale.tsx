import { ReactNode, createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { getLocaleState, subscribeLocale, LocaleMessages, Translate, rt } from '../localization/locale';

// Preserve the existing import API for feature components and controllers.
export { getLocaleText, rt } from '../localization/locale';
export type { LocaleKey, LocaleMessages, Translate } from '../localization/locale';
export const LocaleContext = createContext<LocaleMessages>(getLocaleState().messages);

export function useLocale() { return useContext(LocaleContext); }
export function useLocalePreferences() {
  return useSyncExternalStore(subscribeLocale, getLocaleState, getLocaleState);
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const state = useLocalePreferences();
  return <LocaleContext.Provider value={state.messages}>{children}</LocaleContext.Provider>;
}
export function useLocaleText(): Translate {
  const messages = useLocale();
  return useCallback((key, parameters = {}) => rt(messages[key], parameters), [messages]);
}
