import { ReactNode } from "react";
import { MdClose } from "react-icons/md";
import { useLocaleText } from "../../contexts/Locale";
import OrderShortcut from "./OrderShortcut";

export default function CompactOrderLine({
  name,
  label,
  quantity,
  amount,
  selected,
  deduction,
  busy,
  onSelect,
  onEdit,
  onRemove,
}: {
  name: ReactNode;
  label: string;
  quantity: number;
  amount: ReactNode;
  selected: boolean;
  deduction?: boolean;
  busy?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  const t = useLocaleText();
  return (
    <div
      className={`transaction-item pos-compact-line${selected ? " active" : ""}${deduction ? " deduction" : ""}`}
    >
      {onEdit ? (
        <button
          type="button"
          className="quantity"
          disabled={busy}
          aria-label={t("ORDER_EDIT_LINE_QUANTITY", { item: label, quantity })}
          onClick={onEdit}
        >
          {quantity}
        </button>
      ) : (
        <span className="quantity">{quantity}</span>
      )}
      <button
        type="button"
        className="name"
        aria-pressed={selected}
        disabled={busy}
        onClick={onSelect}
      >
        {name}
      </button>
      {amount}
      <OrderShortcut
        action={{
          children: t("ORDER_REMOVE_LINE", { item: label }),
          onClick: onRemove,
        }}
        icon={<MdClose />}
        busy={busy}
      />
    </div>
  );
}
