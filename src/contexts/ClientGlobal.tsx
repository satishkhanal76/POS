import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { defaultSettings, loadSettings, Settings, STORAGE_KEY, UPDATE_EVENT } from "../settings/settings";

export const ClientGlobalContext = createContext<Settings>(defaultSettings);
export function useClientGlobal() { return useContext(ClientGlobalContext); }

export function ClientGlobalProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    const refresh = () => setSettings(loadSettings());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("light-theme", !settings.darkMode);
    document.documentElement.style.colorScheme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);
  return <ClientGlobalContext.Provider value={settings}>{children}</ClientGlobalContext.Provider>;
}
