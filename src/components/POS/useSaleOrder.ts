import { useEffect, useMemo, useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import StockController from "../../controllers/StockController";
import useExclusiveAction from "../../hooks/useExclusiveAction";
import PaymentTransaction from "../../models/Transaction";
import { STOCK_WARNING } from "../../stock/events";

import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "../../contexts/DatabaseContext";
import { useLocale } from "../../contexts/Locale";
import TransactionController from "../../controllers/TransactionController";
import { ICustomer } from "../../models/Customer";
import CustomerTransaction from "../../models/CustomerTransaction";
import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";
import ProductItem from "../../models/ProductItem";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";
import { ITransaction } from "../../models/Transaction";
import { IButtonProps } from "../Button";

interface SaleTransactionState {
  transaction: ITransaction | null;
  activeTransactionItem:
    IProductTransactionItem | IDiscountTransactionItem | null;
  linkedCustomer: ICustomer | null;
  isAddModalOpen: boolean;
  isCustomerModalOpen: boolean;
}

/** Owns the sale draft and write workflow; SalePOS only renders the workspace. */
export default function useSaleOrder() {
  const t = useLocaleText();
  const { notify } = useNotifications();
  const [quantityItem, setQuantityItem] = useState<
    IProductTransactionItem | IDiscountTransactionItem | null
  >(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const {
    busy: saving,
    isBusy: saveInFlight,
    begin,
    end,
  } = useExclusiveAction();
  const text = useLocale();
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);

  const { transactionsOS, cutomersTransactionsOS, itemOS, stockOS } =
    useDatabase();

  const stockController = useMemo(
    () => new StockController(stockOS),
    [stockOS],
  );
  useEffect(() => {
    const warn = (event: Event) => {
      for (const message of (event as CustomEvent<string[]>).detail)
        notify(message, "info");
    };
    window.addEventListener(STOCK_WARNING, warn);
    return () => window.removeEventListener(STOCK_WARNING, warn);
  }, [notify]);

  const transactionController = useMemo(
    () => new TransactionController(transactionsOS),
    [transactionsOS],
  );
  const [transactionState, setTransactionState] =
    useState<SaleTransactionState>({
      transaction: null,
      activeTransactionItem: null,
      linkedCustomer: null,
      isAddModalOpen: false,
      isCustomerModalOpen: false,
    });
  // Read the initial transaction once; switching order modes must not reload a draft.
  const [initialTransactionId] = useState(() =>
    new URLSearchParams(location.search).get("id"),
  );
  useEffect(() => {
    if (!initialTransactionId) return;
    let cancelled = false;
    void transactionController
      .getTransactionById(initialTransactionId)
      .then((transaction) => {
        if (cancelled) return;
        setTransactionState((current) => ({
          ...current,
          transaction,
          activeTransactionItem: transaction?.getLast() ?? null,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [initialTransactionId, transactionController]);

  // Contact selection queries its own limited pages; do not load every contact here.
  const { transaction, linkedCustomer } = transactionState;
  const isPayment = transaction?.getKind() === "payment";
  const canPost =
    !!transaction &&
    (isPayment || transaction.isPosted()
      ? !!linkedCustomer
      : transaction.hasItems());

  const handleAddBtnClick = () => {
    setTransactionState((t) => ({ ...t, isAddModalOpen: true }));
  };

  const removeItem = (item = transactionState.activeTransactionItem) => {
    if (!transaction || !item || transaction.isPosted() || saveInFlight.current)
      return;

    transaction.removeTransactionItem(item.getItem().getId());

    if (!transaction.getLast()) return handleVoidTransaction();
    setTransactionState((current) => ({
      ...current,
      activeTransactionItem: transaction.getLast(),
    }));
  };

  const handleChangeQuantity = (
    item = transactionState.activeTransactionItem,
  ) => {
    if (
      !transaction ||
      transaction.isPosted() ||
      !item?.getIsQuantityChangable() ||
      saving
    )
      return;
    setQuantityItem(item);
  };

  const handleCreateNewTransaction = async (item?: ProductItem) => {
    const t = transactionController.getNewTransaction();
    let transactionItem:
      IProductTransactionItem | IDiscountTransactionItem | null = null;
    if (item) {
      // Resolve against the draft date so price changes do not rewrite older sales.
      const pricedItem = await itemOS.getAtTimestamp(
        item.getId(),
        t.getTimestamp(),
      );
      transactionItem = t.addProductItem(pricedItem);
    }
    setTransactionState((p) => ({
      ...p,
      transaction: t,
      linkedCustomer: p.transaction?.isPosted() ? null : p.linkedCustomer,
      activeTransactionItem: transactionItem,
      isAddModalOpen: false,
    }));
  };

  const handleAddItem = async (item: ProductItem | null) => {
    if (
      !item ||
      saveInFlight.current ||
      transaction?.isPosted() ||
      transaction?.getKind() === "payment"
    )
      return;
    if (!begin()) return;
    try {
      await itemOS.getOne(item.getId());
      const requested =
        (transaction?.getTransactionProductItem(item.getId())?.getQuantity() ??
          0) + 1;
      const warning = await stockController.checkQuantity(
        item.getId(),
        item.getName(),
        requested,
      );
      if (!transaction) await handleCreateNewTransaction(item);
      else {
        const pricedItem = await itemOS.getAtTimestamp(
          item.getId(),
          transaction.getTimestamp(),
        );
        const transactionItem = transaction.addProductItem(pricedItem);
        setTransactionState((current) => ({
          ...current,
          activeTransactionItem: transactionItem,
          isAddModalOpen: false,
        }));
      }
      if (warning) notify(warning, "info");
    } catch (error) {
      setTransactionState((current) => ({ ...current, isAddModalOpen: false }));
      notify(
        error instanceof Error ? error.message : t("STOCK_UNAVAILABLE"),
        "error",
      );
    } finally {
      end();
    }
  };

  const handlePostTransaction = async () => {
    if (!transaction || !canPost || !begin()) return;
    try {
      if (isPayment && linkedCustomer) {
        await cutomersTransactionsOS.recordPayment(transaction, linkedCustomer);
      } else if (transaction.isPosted() && linkedCustomer) {
        await cutomersTransactionsOS.addOne(
          new CustomerTransaction({
            id: uuidv4(),
            timestamp: Date.now(),
            customer: linkedCustomer,
            transaction,
          }),
        );
      } else {
        const posted = await transactionController.postTransaction(
          transaction,
          linkedCustomer?.getId(),
        );
        if (!posted) throw new Error(t("NOTIFICATION_POST_FAILED"));
      }
      setTransactionState((current) => ({
        ...current,
        transaction: null,
        activeTransactionItem: null,
        linkedCustomer: null,
      }));
      notify(
        linkedCustomer
          ? t(
              isPayment
                ? "PAYMENT_SAVED"
                : "TRANSACTION_LINKED_TO_CUSTOMER_SUCCESS",
              {
                CUSTOMER_NAME: linkedCustomer.getName(),
              },
            )
          : t("NOTIFICATION_POSTED"),
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : t("NOTIFICATION_POST_FAILED"),
        "error",
      );
    } finally {
      end();
    }
  };

  const handleVoidTransaction = () => {
    notify(t("NOTIFICATION_VOIDED"), "info");
    setTransactionState((t) => ({
      ...t,
      transaction: null,
      activeTransactionItem: null,
      linkedCustomer: null,
    }));
  };

  const selectCustomer = async () => {
    setTransactionState((t) => ({
      ...t,
      isCustomerModalOpen: true,
    }));
  };

  const handleDiscount = () => {
    if (!transaction || transaction.isPosted() || !transaction.hasItems())
      return;
    setDiscountModalOpen(true);
  };

  const setLinkedCustomer = (customer: ICustomer | null) => {
    if (saveInFlight.current) return;
    setTransactionState((current) => ({
      ...current,
      linkedCustomer: customer,
      isCustomerModalOpen: false,
    }));
  };

  const customer = {
    children: text.BUTTON_ADD_TO_CUSTOMER,
    onClick: selectCustomer,
  };
  const post = {
    children: text.BUTTON_POST_TRANSACTION,
    className: "pos-action pos-action-primary",
    disabled: !canPost,
    onClick: handlePostTransaction,
  };
  const add = {
    children: text.BUTTON_ADD,
    className: "pos-action pos-action-add",
    disabled: isPayment || !!transaction?.isPosted(),
    onClick: handleAddBtnClick,
  };
  const payment = {
    children: t("PAYMENT_RECORD"),
    disabled: !!transaction,
    onClick: () => setPaymentModalOpen(true),
  };
  const discount = {
    children: text.BUTTON_DISCOUNT,
    disabled: isPayment || !transaction?.hasItems() || transaction.isPosted(),
    onClick: handleDiscount,
  };
  const voidOrder = {
    className: "pos-action pos-action-danger",
    children: transaction?.isPosted()
      ? text.BUTTON_CREATE_NEW_TRANSACTION
      : text.BUTTON_VOID_TRANSACTION,
    disabled: !transaction ? true : false,
    onClick: transaction?.isPosted()
      ? () => handleCreateNewTransaction()
      : handleVoidTransaction,
  };
  const buttonsProps: IButtonProps[] = [
    payment,
    add,
    {
      children: text.BUTTON_REMOVE,
      disabled:
        isPayment ||
        transaction?.isPosted() ||
        !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: () => removeItem(),
    },
    {
      children: text.BUTTON_CHANGE_QUANTITY,
      disabled:
        isPayment ||
        transaction?.isPosted() ||
        !transactionState.activeTransactionItem?.getIsQuantityChangable()
          ? true
          : false,
      onClick: () => handleChangeQuantity(),
    },
    post,
    voidOrder,
    customer,
    discount,
  ];

  const recordPayment = (amount: number) => {
    setTransactionState((current) => ({
      ...current,
      transaction: new PaymentTransaction(undefined, undefined, amount),
      activeTransactionItem: null,
    }));
    setPaymentModalOpen(false);
  };

  const applyQuantity = async (quantity: number) => {
    if (!transaction || !quantityItem) return;
    if (transaction.isPosted()) return;
    const warning = await stockController.checkQuantity(
      quantityItem.getItem().getId(),
      quantityItem.getItem().getName(),
      quantity,
    );
    transaction.changeTransactionItemQuantity(
      quantityItem.getItem().getId(),
      quantity,
    );
    setTransactionState((current) => ({
      ...current,
      activeTransactionItem: quantityItem,
    }));
    setQuantityItem(null);
    if (warning) notify(warning, "info");
    notify(t("QUANTITY_UPDATED", { item: quantityItem.getItem().getName() }));
  };

  const applyDiscount = (item: IDiscountTransactionItem) => {
    setTransactionState((current) => ({
      ...current,
      activeTransactionItem: item,
    }));
    setDiscountModalOpen(false);
    notify(t("NOTIFICATION_DISCOUNT_APPLIED"));
  };

  return {
    applyDiscount,
    applyQuantity,
    recordPayment,
    t,
    text,
    quantityItem,
    setQuantityItem,
    paymentModalOpen,
    setPaymentModalOpen,
    saving,
    isDiscountModalOpen,
    setDiscountModalOpen,
    transactionState,
    setTransactionState,
    transaction,
    isPayment,
    buttonsProps,
    shortcuts: {
      payment,
      add,
      post,
      customer: { ...customer, disabled: !transaction },
      discount,
      voidOrder,
    },
    removeItem,
    handleAddItem,
    linkedCustomer,
    setLinkedCustomer,
    handleAddBtnClick,
    handleChangeQuantity,
  };
}
