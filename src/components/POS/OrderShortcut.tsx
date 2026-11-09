import { ReactNode } from "react";
import { IButtonProps } from "../Button";

export default function OrderShortcut({
  action,
  icon,
  busy,
  primary,
  labeled,
  danger,
}: {
  action: Pick<IButtonProps, "onClick" | "disabled"> & { children: string };
  icon: ReactNode;
  busy?: boolean;
  primary?: boolean;
  labeled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`pos-shortcut${primary ? " pos-shortcut-primary" : ""}${labeled ? " pos-shortcut-labeled" : ""}${danger ? " pos-shortcut-danger" : ""}`}
      aria-label={action.children}
      title={action.children}
      disabled={busy || action.disabled}
      onClick={action.onClick}
    >
      <span aria-hidden="true">{icon}</span>
      {labeled && action.children}
    </button>
  );
}
