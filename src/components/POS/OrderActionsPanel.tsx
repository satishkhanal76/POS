import { ReactNode } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { IButtonProps } from "../Button";
import TransactionButtons from "../Transaction/TransactionButtons";

/** Shared presentation only; each order mode owns its actions and persistence. */
export default function OrderActionsPanel({
  buttons,
  busy,
  description,
  note,
}: {
  buttons: IButtonProps[];
  busy: boolean;
  description: ReactNode;
  note: ReactNode;
}) {
  const t = useLocaleText();
  return (
    <aside className="pos-actions-panel" aria-label={t("UI_ORDER_ACTIONS")}>
      <h2>{t("UI_ORDER_ACTIONS")}</h2>
      <p>{description}</p>
      <TransactionButtons
        buttonsClassName="pos-action"
        buttonsClassNameWhenActive="pos-action"
        buttonsProps={buttons.map((button) => ({
          ...button,
          disabled: busy || button.disabled,
        }))}
      />
      <div className="pos-actions-note">{note}</div>
    </aside>
  );
}
