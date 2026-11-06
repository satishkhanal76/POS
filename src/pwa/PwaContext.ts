import { createContext, useContext } from "react";

export type InstallChoice = { outcome: "accepted" | "dismissed" };
export interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}
export interface PwaState {
  installed: boolean;
  canInstall: boolean;
  online: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  setupFailed: boolean;
  install: () => Promise<InstallChoice["outcome"] | null>;
  update: () => Promise<void>;
}
export const PwaContext = createContext<PwaState | null>(null);
export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PwaProvider is required");
  return context;
}
