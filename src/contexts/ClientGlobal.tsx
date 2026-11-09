import { applyTheme, SYSTEM_THEME_QUERY } from "../settings/theme";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  defaultSettings,
  loadSettings,
  Settings,
  STORAGE_KEY,
  UPDATE_EVENT,
} from "../settings/settings";

export const ClientGlobalContext = createContext<Settings>(defaultSettings);
export function useClientGlobal() {
  return useContext(ClientGlobalContext);
}

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
  useLayoutEffect(() => {
    const system = window.matchMedia(SYSTEM_THEME_QUERY);
    const update = () => applyTheme(settings.theme, system.matches);
    update();
    if (settings.theme !== "system") return;
    system.addEventListener("change", update);
    return () => system.removeEventListener("change", update);
  }, [settings.theme]);
  return (
    <ClientGlobalContext.Provider value={settings}>
      {children}
    </ClientGlobalContext.Provider>
  );
}
