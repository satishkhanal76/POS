import { ReactNode, createContext, useContext } from "react";
import ClientJSON from "../data/ClientGlobal.json";

interface IClientGlobalContext {
  currencyCharacter: string;
}

const values: IClientGlobalContext = ClientJSON;

export const ClientGlobalContext = createContext<IClientGlobalContext>(values);

interface IClientGlobalProvider {
  children: ReactNode;
}

export function useClientGlobal() {
  return useContext(ClientGlobalContext);
}

export function ClientGlobalProvider({ children }: IClientGlobalProvider) {
  // values.currencyCharacter = "₹";
  return (
    <ClientGlobalContext.Provider value={values}>
      {children}
    </ClientGlobalContext.Provider>
  );
}
