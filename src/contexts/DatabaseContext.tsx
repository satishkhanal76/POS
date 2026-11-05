import { ReactNode, createContext, useContext } from "react";
import { createDatabaseStores } from "../database/DatabaseStores";
import { workspaceController } from "../controllers/WorkspaceController";

const DATABASE_OS = createDatabaseStores(workspaceController.isDemo() ? "POS_DEMO" : "POS");
export const DatabaseContext = createContext(DATABASE_OS);
export function useDatabase() { return useContext(DatabaseContext); }
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return <DatabaseContext.Provider value={DATABASE_OS}>{children}</DatabaseContext.Provider>;
}
