import StockController from '../controllers/StockController';
import { STOCK_WARNING } from '../stock/events';
import PaymentForm from "./Transaction/PaymentForm";
import PaymentTransaction from "../models/Transaction";
import TransactionView from "./Transaction/TransactionView";
import QuantityForm from "./Transaction/QuantityForm";
import { useNotifications } from "../contexts/Notifications";
import DiscountForm from "./Discount/DiscountForm";
import { useLocaleText } from '../contexts/Locale';
import PageHeader from "./Layout/PageHeader";
import "../styles/POS.css";
import Price from "./Items/Price";
import { MdOutlineShoppingBag } from "react-icons/md";
import { useEffect, useMemo, useRef, useState } from "react";

import { v4 as uuidv4 } from "uuid";
import TransactionController, {
  ITransactionController,
} from "../controllers/TransactionController";
import { ICustomer } from "../models/Customer";
import { useLocale } from "../contexts/Locale";
import { useDatabase } from "../contexts/DatabaseContext";
import CustomerController from "../controllers/CustomerController";
import CustomerTransaction from "../models/CustomerTransaction";
import { IButtonProps } from "./Button";
import TransactionButtons from "./Transaction/TransactionButtons";
import CustomerSelectionModal from "./Modals/CustomerSelectionModal";
import ItemSelectionModal from "./Modals/ItemSelectionModal";
import Transaction from "./Transaction/Transaction";
import { ITransaction } from "../models/Transaction";
import { IProductTransactionItem } from "../models/ProductTransactionItem";
import { IDiscountTransactionItem } from "../models/DiscountTransactionItem";
import ProductItem from "../models/ProductItem";

export interface ITransactionState {
  transaction: ITransaction | null;
  activeTransactionItem:
    | IProductTransactionItem
    | IDiscountTransactionItem
    | null;
  transactionController: ITransactionController;
  isAddModalOpen: boolean;
  isCustomerModalOpen: boolean;
  customers: ICustomer[];
}

const POS = () => {
  const t = useLocaleText();
  const { notify } = useNotifications();
  const [quantityItem, setQuantityItem] = useState<IProductTransactionItem | IDiscountTransactionItem | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const text = useLocale();
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);

  const { transactionsOS, customerOS, cutomersTransactionsOS, itemOS, stockOS } =
    useDatabase();


  const stockController = useMemo(() => new StockController(stockOS), [stockOS]);
  useEffect(() => {
    const warn = (event: Event) => { for (const message of (event as CustomEvent<string[]>).detail) notify(message, 'info'); };
    window.addEventListener(STOCK_WARNING, warn);
    return () => window.removeEventListener(STOCK_WARNING, warn);
  }, [notify]);

  const [transactionState, setTransactionState] = useState<ITransactionState>(
    {} as ITransactionState
  );

  useEffect(() => {
    const transactionController =
      transactionState.transactionController ||
      new TransactionController(transactionsOS);

    const loadTransaction = async () => {
      const queryParameters = new URLSearchParams(location.search);
      const id = queryParameters.get("id");
      if (!id) {
        setTransactionState((g) => ({
          ...g,
          transaction: null,
          activeTransactionItem: null,
          isAddModalOpen: false,
          transactionController: transactionController,
          isCustomerModalOpen: false,
          items: [],
          customers: [],
        }));
        return;
      }
      const t = await transactionController.getTransactionById(id);
      setTransactionState((g) => ({
        ...g,
        transaction: t,
        activeTransactionItem: t?.getLast() || null,
        isAddModalOpen: false,
        transactionController: transactionController,
        items: [],
      }));
      return;
    };

    const loadCustomers = async () => {
      const customerController = new CustomerController(customerOS);
      const allCustomers: ICustomer[] =
        await customerController.getAllCustomers();
      setTransactionState((g) => ({
        ...g,
        customers: allCustomers,
      }));
    };

    loadTransaction();

    loadCustomers();
  }, []);

  const { transaction, transactionController } = transactionState;

  const handleAddBtnClick = () => {
    setTransactionState((t) => ({ ...t, isAddModalOpen: true }));
  };

  const handleRemoveBtnClick = () => {
    if (!transaction || !transactionState.activeTransactionItem) return;

    transaction.removeTransactionItem(
      transactionState.activeTransactionItem.getItem().getId()
    );

    if (!transaction.getLast()) return handleVoidTransaction();
    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transaction.getLast(),
    }));
  };

  const handleChangeQuantity = (item = transactionState.activeTransactionItem) => {
    if (!transaction || transaction.isPosted() || !item?.getIsQuantityChangable() || saving) return;
    setQuantityItem(item);
  };

  const handleCreateNewTransaction = async (item?: ProductItem) => {
    const t = transactionController.getNewTransaction();
    let transactionItem:
      | IProductTransactionItem
      | IDiscountTransactionItem
      | null = null;
    if (item) {
      const pricedItem = await itemOS.getAtTimestamp(item.getId(), t.getTimestamp());
      transactionItem = t.addProductItem(pricedItem);
    }
    setTransactionState((p) => ({
      ...p,
      transaction: t,
      activeTransactionItem: transactionItem,
      isAddModalOpen: false,
    }));
  };

  const handleAddItem = async (item: ProductItem | null) => {
    if (!item || saveInFlight.current || transaction?.isPosted() || transaction?.getKind() === 'payment') return;
    saveInFlight.current = true; setSaving(true);
    try {
      const requested = (transaction?.getTransactionProductItem(item.getId())?.getQuantity() ?? 0) + 1;
      const warning = await stockController.checkQuantity(item.getId(), item.getName(), requested);
      if (!transaction) await handleCreateNewTransaction(item);
      else {
        const pricedItem = await itemOS.getAtTimestamp(item.getId(), transaction.getTimestamp());
        const transactionItem = transaction.addProductItem(pricedItem);
        setTransactionState(current => ({ ...current, activeTransactionItem: transactionItem, isAddModalOpen: false }));
      }
      if (warning) notify(warning, 'info');
    } catch (error) {
      setTransactionState(current => ({ ...current, isAddModalOpen: false }));
      notify(error instanceof Error ? error.message : t('STOCK_UNAVAILABLE'), 'error');
    } finally { saveInFlight.current = false; setSaving(false); }
  };

  const handlePostTransaction = async () => {
    if (!transaction || transaction.isPosted() || saveInFlight.current) return;
    saveInFlight.current = true; setSaving(true);
    try {
      const posted = await transactionController.postTransaction(transaction);
      if (!posted) throw new Error(t('NOTIFICATION_POST_FAILED'));
      transaction.setIsPosted(true);
      setTransactionState(current => ({ ...current, transaction: null, activeTransactionItem: null }));
      notify(t('NOTIFICATION_POSTED'));
    } catch (error) { notify(error instanceof Error ? error.message : t('NOTIFICATION_POST_FAILED'), 'error'); }
    finally { saveInFlight.current = false; setSaving(false); }
  };

  const handleVoidTransaction = () => {
    notify(t("NOTIFICATION_VOIDED"), "info");
    setTransactionState((t) => ({
      ...t,
      transaction: null,
      activeTransactionItem: null,
    }));
  };

  const selectCustomer = async () => {
    setTransactionState((t) => ({
      ...t,
      isCustomerModalOpen: true,
    }));
  };

  const handleDiscount = () => {
    if (!transaction || transaction.isPosted() || !transaction.hasItems()) return;
    setDiscountModalOpen(true);
  };

  const handleAddCustomer = async (customer: ICustomer | null) => {
    if (!transaction || !customer || saveInFlight.current) return;
    saveInFlight.current = true; setSaving(true);
    setTransactionState(current => ({ ...current, isCustomerModalOpen: false }));
    try {
      if (transaction.getKind() === "payment") {
        await cutomersTransactionsOS.recordPayment(transaction as PaymentTransaction, customer);
      } else {
        if (!transaction.isPosted()) {
          const posted = await transactionController.postTransaction(transaction);
          if (!posted) throw new Error(t('NOTIFICATION_POST_FAILED'));
          transaction.setIsPosted(true);
        }
        await cutomersTransactionsOS.addOne(new CustomerTransaction({
          id: uuidv4(), timestamp: Date.now(), customer, transaction,
        }));
      }
      setTransactionState(current => ({ ...current, transaction: null, activeTransactionItem: null }));
      notify(t(transaction.getKind() === "payment" ? "PAYMENT_SAVED" : 'TRANSACTION_LINKED_TO_CUSTOMER_SUCCESS', { CUSTOMER_NAME: customer.getName() }));
    } catch (error) {
      notify(error instanceof Error ? error.message : t(transaction.isPosted() ? 'NOTIFICATION_CUSTOMER_LINK_FAILED' : 'NOTIFICATION_POST_FAILED'), 'error');
      setTransactionState(current => ({ ...current }));
    } finally { saveInFlight.current = false; setSaving(false); }
  };

  const isPayment = transaction?.getKind() === "payment";
  const buttonsProps: IButtonProps[] = [
    { children: t("PAYMENT_RECORD"), disabled: !!transaction, onClick: () => setPaymentModalOpen(true) },
    {
      children: text.BUTTON_ADD,
      className: "pos-action pos-action-add",
      disabled: isPayment || !!transaction?.isPosted(),
      onClick: handleAddBtnClick,
    },
    {
      children: text.BUTTON_REMOVE,
      disabled:
        isPayment || transaction?.isPosted() || !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleRemoveBtnClick,
    },
    {
      children: text.BUTTON_CHANGE_QUANTITY,
      disabled:
        isPayment || transaction?.isPosted() || !transactionState.activeTransactionItem?.getIsQuantityChangable()
          ? true
          : false,
      onClick: () => handleChangeQuantity(),
    },
    {
      children: text.BUTTON_POST_TRANSACTION,
      className: "pos-action pos-action-primary",
      disabled:
        isPayment || transaction?.isPosted() || !transaction?.hasItems() ? true : false,
      onClick: handlePostTransaction,
    },
    {
      className: "pos-action pos-action-danger",
      children: transaction?.isPosted()
        ? text.BUTTON_CREATE_NEW_TRANSACTION
        : text.BUTTON_VOID_TRANSACTION,
      disabled: !transaction ? true : false,
      onClick: transaction?.isPosted()
        ? () => handleCreateNewTransaction()
        : handleVoidTransaction,
    },
    {
      children: text.BUTTON_ADD_TO_CUSTOMER,
      disabled: !transaction ? true : false,
      onClick: selectCustomer,
    },
    {
      children: text.BUTTON_DISCOUNT,
      disabled: isPayment || !transaction?.hasItems() || transaction.isPosted(),
      onClick: handleDiscount,
    },
  ];

  return (
    <>
      {paymentModalOpen && <PaymentForm onClose={() => setPaymentModalOpen(false)} onApply={amount => {
        setTransactionState(current => ({ ...current, transaction: new PaymentTransaction(undefined, undefined, amount), activeTransactionItem: null }));
        setPaymentModalOpen(false);
      }} />}
      {quantityItem && transaction && <QuantityForm item={quantityItem} onClose={() => setQuantityItem(null)} onApply={async quantity => {
        if (transaction.isPosted()) return;
        const warning = await stockController.checkQuantity(quantityItem.getItem().getId(), quantityItem.getItem().getName(), quantity);
        transaction.changeTransactionItemQuantity(quantityItem.getItem().getId(), quantity);
        setTransactionState(current => ({ ...current, activeTransactionItem: quantityItem }));
        setQuantityItem(null);
        if (warning) notify(warning, 'info');
        notify(t('QUANTITY_UPDATED', { item: quantityItem.getItem().getName() }));
      }} />}
      {isDiscountModalOpen && transaction && <DiscountForm transaction={transaction}
        onClose={() => setDiscountModalOpen(false)}
        onApplied={item => {
          setTransactionState(current => ({ ...current, activeTransactionItem: item }));
          setDiscountModalOpen(false);
          notify(t('NOTIFICATION_DISCOUNT_APPLIED'));
        }} />}
      <ItemSelectionModal
        onClose={() => {
          setTransactionState((t) => ({
            ...t,
            isAddModalOpen: false,
          }));
        }}
        isModalOpen={transactionState.isAddModalOpen}
        handleAddItem={handleAddItem}
      />
      <CustomerSelectionModal
        onClose={() => {
          setTransactionState((t) => ({
            ...t,
            isCustomerModalOpen: false,
          }));
        }}
        isModalOpen={transactionState.isCustomerModalOpen}
        handleAddItem={handleAddCustomer}
      />
      <main className="pos-workspace">
        <PageHeader title={t('UI_POINT_OF_SALE')} eyebrow={t('UI_SALES_WORKSPACE')} description={t('UI_ADD_ITEMS_REVIEW_THE_ORDER_AND_COMPLETE_YOUR_TRANSACTION')}
          actions={<span className={`pos-status${transaction?.isPosted() ? ' is-posted' : ''}`}>{transaction?.isPosted() ? t('UI_POSTED_TRANSACTION') : transaction ? t('UI_IN_PROGRESS') : t('UI_READY_FOR_A_NEW_SALE')}</span>} />
        <div className="pos-layout">
          <section className="pos-order" aria-label={t('UI_CURRENT_ORDER')}>
            {transaction && isPayment ? <TransactionView transaction={transaction} activeItem={null} onClick={() => {}} onDoubleClick={() => {}} /> : transaction && transactionState.activeTransactionItem ? (
              <Transaction
                transaction={transaction}
                activeTransactionItem={transactionState.activeTransactionItem}
                onClick={(transactionItem) => {
                  setTransactionState((t) => ({ ...t, activeTransactionItem: transactionItem }));
                }}
                handleChangeQuantity={handleChangeQuantity}
              />
            ) : (
              <div className="pos-empty-order">
                <header><h2>{t('UI_CURRENT_ORDER')}</h2><span>{t('UI_NO_ITEMS_YET')}</span></header>
                <div className="pos-empty-state">
                  <span className="pos-empty-icon"><MdOutlineShoppingBag aria-hidden="true" /></span>
                  <h3>{t('UI_START_YOUR_NEXT_SALE')}</h3>
                  <p>{t('UI_CHOOSE_AN_ITEM_TO_BUILD_AN_ORDER_YOU_CAN')}</p>
                  <button type="button" className="pos-start-button" disabled={saving} onClick={handleAddBtnClick}>{t('UI_ADD_YOUR_FIRST_ITEM')}</button>
                </div>
                <footer className="transaction-details"><span>{text.TOTAL}</span><Price price={0} /></footer>
              </div>
            )}
          </section>
          <aside className="pos-actions-panel" aria-labelledby="pos-actions-title">
            <h2 id="pos-actions-title">{t('UI_ORDER_ACTIONS')}</h2>
            <p>{isPayment ? t('PAYMENT_NEXT') : transaction?.isPosted() ? t('UI_THIS_SALE_HAS_BEEN_POSTED_START_A_NEW_TRANSACTION') : t('UI_SELECT_AN_ORDER_ITEM_TO_CHANGE_ITS_QUANTITY_OR')}</p>
            <TransactionButtons
              buttonsClassName="pos-action"
              buttonsClassNameWhenActive="pos-action"
              buttonsProps={buttonsProps.map(button => ({ ...button, disabled: saving || button.disabled }))}
            />
            <div className="pos-actions-note">{isPayment ? t('PAYMENT_DESCRIPTION') : transaction?.isPosted() ? t('UI_POSTED_SALES_ARE_AVAILABLE_IN_HISTORY') : t('UI_POST_SAVES_THE_SALE_ADD_TO_CUSTOMER_SAVES_IT')}</div>
          </aside>
        </div>
      </main>
    </>
  );
};

export default POS;
