import { createContext, useContext } from "react";

export type NotificationTone = "success" | "error" | "info";
export interface Notification {
  id: number;
  message: string;
  tone: NotificationTone;
}
export interface NotificationActions {
  notify: (message: string, tone?: NotificationTone) => void;
}
export const NotificationContext = createContext<NotificationActions | null>(
  null,
);
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("NotificationProvider is required");
  return context;
}
