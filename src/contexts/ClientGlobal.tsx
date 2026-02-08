import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import ClientJSON from "../data/ClientGlobal.json";

interface IClientGlobalContext {
  currencyCharacter: string;
  numOfDecimalPlaces: number;
}

const values: IClientGlobalContext = ClientJSON;

const STORAGE_KEY = "pos.clientGlobal";
const UPDATE_EVENT = "clientGlobal:updated";

function loadClientGlobal(): IClientGlobalContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...values };
    const parsed = JSON.parse(raw) as Partial<IClientGlobalContext>;
    return { ...values, ...parsed };
  } catch {
    return { ...values };
  }
}

export const ClientGlobalContext = createContext<IClientGlobalContext>(values);

interface IClientGlobalProvider {
  children: ReactNode;
}

export function useClientGlobal() {
  return useContext(ClientGlobalContext);
}

export function ClientGlobalProvider({ children }: IClientGlobalProvider) {
  const [clientGlobal, setClientGlobal] = useState<IClientGlobalContext>(() => {
    // LocalStorage is available in the browser; this is a client-only app.
    return loadClientGlobal();
  });

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<IClientGlobalContext>;
      if (!ce.detail) return;
      setClientGlobal({ ...values, ...ce.detail });
    };

    window.addEventListener(UPDATE_EVENT, onUpdated as EventListener);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setClientGlobal(loadClientGlobal());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <ClientGlobalContext.Provider value={clientGlobal}>
      {children}
    </ClientGlobalContext.Provider>
  );
}
