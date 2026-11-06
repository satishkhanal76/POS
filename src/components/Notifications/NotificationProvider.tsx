import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  MdCheckCircle,
  MdErrorOutline,
  MdInfoOutline,
  MdClose,
} from "react-icons/md";
import {
  Notification,
  NotificationContext,
  NotificationTone,
} from "../../contexts/Notifications";
import { useLocaleText } from "../../contexts/Locale";
import "./Notifications.css";

function NotificationPill({
  notification,
  dismiss,
}: {
  notification: Notification;
  dismiss: (id: number) => void;
}) {
  const t = useLocaleText();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(
      () => dismiss(notification.id),
      notification.tone === "error" ? 6500 : 4500,
    );
    return () => window.clearTimeout(timer);
  }, [dismiss, notification.id, notification.tone, hovered, focused]);
  const Icon =
    notification.tone === "error"
      ? MdErrorOutline
      : notification.tone === "info"
        ? MdInfoOutline
        : MdCheckCircle;
  return (
    <div
      className={`notification-pill notification-${notification.tone}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <Icon className="notification-icon" aria-hidden="true" />
      <span
        className="notification-message"
        role={notification.tone === "error" ? "alert" : "status"}
      >
        {notification.message}
      </span>
      <button
        type="button"
        onClick={() => dismiss(notification.id)}
        aria-label={t("NOTIFICATION_DISMISS")}
      >
        <MdClose aria-hidden="true" />
      </button>
    </div>
  );
}

export default function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const t = useLocaleText();
  const sequence = useRef(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dismiss = useCallback(
    (id: number) =>
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      ),
    [],
  );
  const notify = useCallback(
    (message: string, tone: NotificationTone = "success") => {
      const notification = { id: ++sequence.current, message, tone };
      setNotifications((current) => [...current.slice(-2), notification]);
    },
    [],
  );
  const actions = useMemo(() => ({ notify }), [notify]);
  return (
    <NotificationContext.Provider value={actions}>
      {children}
      {createPortal(
        <section
          className="notification-stack"
          aria-label={t("NOTIFICATION_REGION")}
        >
          {notifications.map((notification) => (
            <NotificationPill
              key={notification.id}
              notification={notification}
              dismiss={dismiss}
            />
          ))}
        </section>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}
