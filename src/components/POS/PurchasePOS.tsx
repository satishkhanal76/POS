import { createPurchaseInvoice } from "../../purchasing/invoice";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import { IContact } from "../../models/Contact";
import ProductItem from "../../models/ProductItem";
import { PurchaseOrderLine } from "../../purchasing/order";
import { dateInput, dashboardRange } from "../../dashboard/period";
import PurchasingController from "../../controllers/PurchasingController";
import {
  roundQuantity,
  validQuantity,
} from "../../validators/QuantityValidator";
import PageHeader from "../Layout/PageHeader";
import ItemSelectionModal from "../Modals/ItemSelectionModal";
import CustomerSelectionModal from "../Modals/CustomerSelectionModal";
import TransactionButtons from "../Transaction/TransactionButtons";
import { IButtonProps } from "../Button";
import SupplierPaymentForm from "../Purchasing/SupplierPaymentForm";
import PurchaseLineForm from "./PurchaseLineForm";
import PurchaseOrderView from "./PurchaseOrderView";
export default function PurchasePOS({
  renderModeSwitch,
  initialSupplierId,
}: {
  renderModeSwitch: (disabled: boolean) => ReactNode;
  initialSupplierId?: string;
}) {
  const t = useLocaleText(),
    stores = useDatabase(),
    { notify } = useNotifications();
  const controller = useMemo(
    () => new PurchasingController(stores.purchasingOS),
    [stores.purchasingOS],
  );
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [supplier, setSupplier] = useState<IContact | null>(null),
    [date] = useState(() => dateInput(new Date())),
    [reference, setReference] = useState(createPurchaseInvoice);
  const [addOpen, setAddOpen] = useState(false),
    [supplierOpen, setSupplierOpen] = useState(false),
    [editing, setEditing] = useState<{
      line: PurchaseOrderLine;
      isNew: boolean;
    } | null>(null),
    [paymentOpen, setPaymentOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    postAfterSelection = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (initialSupplierId)
      void stores.contactOS
        .getOne(initialSupplierId)
        .then((person) => {
          if (!cancelled) setSupplier(person);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialSupplierId, stores]);
  const active = lines.find((line) => line.id === selected);
  const addItem = async (item: ProductItem | null) => {
    if (!item || lock.current) return;
    lock.current = true;
    setBusy(true);
    setAddOpen(false);
    try {
      const current = await stores.itemOS.getOne(item.getId());
      if (current.canPurchase === 0) throw new Error(t("BUY_INVALID"));
      const existing = lines.find((line) => line.productId === item.getId());
      if (existing) {
        const quantity = roundQuantity(existing.quantity + 1);
        if (!validQuantity(quantity)) throw new Error(t("QUANTITY_INVALID"));
        setLines((rows) =>
          rows.map((row) =>
            row.id === existing.id ? { ...row, quantity } : row,
          ),
        );
        setSelected(existing.id);
      } else
        setEditing({
          line: {
            id: uuid(),
            productId: item.getId(),
            name: item.getName(),
            quantity: 1,
            unitCost: 0,
          },
          isNew: true,
        });
    } catch (failure) {
      notify(
        failure instanceof Error ? failure.message : t("BUY_INVALID"),
        "error",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const post = async (person: IContact) => {
    if (lock.current || !lines.length) return;
    lock.current = true;
    setBusy(true);
    setSupplierOpen(false);
    try {
      const range = dashboardRange("day", date, date);
      if (!range) throw new Error(t("DASH_INVALID"));
      const postedAt = new Date(range.start),
        now = new Date();
      postedAt.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );
      await controller.receive({
        contactId: person.getId(),
        timestamp: postedAt.getTime(),
        reference,
        lines: lines.map(({ productId, quantity, unitCost }) => ({
          productId,
          quantity,
          unitCost,
        })),
      });
      setLines([]);
      setSelected(null);
      setReference(createPurchaseInvoice());
      notify(t("ORDER_PURCHASE_POSTED", { supplier: person.getName() }));
    } catch (failure) {
      notify(
        failure instanceof Error ? failure.message : t("BUY_SAVE_FAILED"),
        "error",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const chooseSupplier = (forPosting: boolean) => {
    postAfterSelection.current = forPosting;
    setSupplierOpen(true);
  };
  const buttons: IButtonProps[] = [
    {
      children: t("BUTTON_ADD"),
      className: "pos-action pos-action-add",
      onClick: () => setAddOpen(true),
    },
    {
      children: t("BUTTON_REMOVE"),
      disabled: !active,
      onClick: () => {
        setLines((rows) => rows.filter((row) => row.id !== selected));
        setSelected(null);
      },
    },
    {
      children: t("BUTTON_CHANGE_QUANTITY"),
      disabled: !active,
      onClick: () => {
        if (active) setEditing({ line: active, isNew: false });
      },
    },
    {
      children: t("ORDER_CHANGE_COST"),
      disabled: !active,
      onClick: () => {
        if (active) setEditing({ line: active, isNew: false });
      },
    },
    {
      children: t("ORDER_POST_PURCHASE"),
      className: "pos-action pos-action-primary",
      disabled: !lines.length,
      onClick: () => {
        if (supplier) void post(supplier);
        else chooseSupplier(true);
      },
    },
    {
      children: t("ORDER_SELECT_SUPPLIER"),
      onClick: () => chooseSupplier(false),
    },
    {
      children: t("BUTTON_VOID_TRANSACTION"),
      className: "pos-action pos-action-danger",
      disabled: !lines.length,
      onClick: () => {
        if (window.confirm(t("ORDER_CLEAR_PURCHASE"))) {
          setLines([]);
          setSelected(null);
          setReference(createPurchaseInvoice());
          notify(t("NOTIFICATION_VOIDED"), "info");
        }
      },
    },
    {
      children: t("BUY_PAY"),
      disabled: !!lines.length,
      onClick: () => setPaymentOpen(true),
    },
  ];
  return (
    <>
      <ItemSelectionModal
        purchase
        isModalOpen={addOpen}
        onClose={() => setAddOpen(false)}
        handleAddItem={addItem}
      />
      {supplierOpen && (
        <CustomerSelectionModal
          title={t("ORDER_SELECT_SUPPLIER")}
          isModalOpen
          onClose={() => {
            setSupplierOpen(false);
            postAfterSelection.current = false;
          }}
          handleAddItem={(person) => {
            if (!person) return;
            setSupplier(person);
            setSupplierOpen(false);
            if (postAfterSelection.current) {
              postAfterSelection.current = false;
              void post(person);
            }
          }}
        />
      )}
      {editing && (
        <PurchaseLineForm
          line={editing.line}
          needsCost={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(line) => {
            setLines((rows) =>
              editing.isNew
                ? [...rows, line]
                : rows.map((row) => (row.id === line.id ? line : row)),
            );
            setSelected(line.id);
            setEditing(null);
          }}
        />
      )}
      {paymentOpen && (
        <SupplierPaymentForm
          contactId={supplier?.getId()}
          onClose={() => setPaymentOpen(false)}
          onSaved={() => setPaymentOpen(false)}
        />
      )}
      <main className="pos-workspace purchase-workspace">
        <PageHeader
          title={t("UI_POINT_OF_SALE")}
          eyebrow={t("ORDER_PURCHASE_WORKSPACE")}
          description={t("ORDER_PURCHASE_HELP")}
          actions={<span className="pos-status">{t("BUY_PURCHASE_MODE")}</span>}
        />
        <div className="pos-layout">
          <section className="pos-order" aria-label={t("UI_CURRENT_ORDER")}>
            {renderModeSwitch(busy)}
            <PurchaseOrderView
              disabled={busy}
              lines={lines}
              selected={selected}
              onSelect={setSelected}
              onEdit={(line) => setEditing({ line, isNew: false })}
              supplier={supplier?.getName() ?? ""}
              date={date}
              reference={reference}
              onAdd={() => setAddOpen(true)}
            />
          </section>
          <aside className="pos-actions-panel">
            <h2>{t("UI_ORDER_ACTIONS")}</h2>
            <p>{t("ORDER_PURCHASE_HELP")}</p>
            <TransactionButtons
              buttonsClassName="pos-action"
              buttonsClassNameWhenActive="pos-action"
              buttonsProps={buttons.map((button) => ({
                ...button,
                disabled: busy || button.disabled,
              }))}
            />
            <div className="pos-actions-note">{t("BUY_RECEIVE_HELP")}</div>
          </aside>
        </div>
      </main>
    </>
  );
}
