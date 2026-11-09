import { ReactNode } from "react";
import {
  MdAdd,
  MdCheck,
  MdClose,
  MdOutlineCancel,
  MdOutlineLocalOffer,
  MdOutlinePayments,
  MdOutlineShoppingBag,
  MdPersonAddAlt,
} from "react-icons/md";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import OrderShortcut from "./OrderShortcut";
import "../../styles/POS.css";
import DiscountForm from "../Discount/DiscountForm";
import Price from "../Items/Price";
import PageHeader from "../Layout/PageHeader";
import PaymentForm from "../Transaction/PaymentForm";
import QuantityForm from "../Transaction/QuantityForm";
import TransactionView from "../Transaction/TransactionView";

import CustomerSelectionModal from "../Modals/CustomerSelectionModal";
import ItemSelectionModal from "../Modals/ItemSelectionModal";
import OrderActionsPanel from "./OrderActionsPanel";

import useSaleOrder from "./useSaleOrder";

export default function SalePOS({
  renderModeSwitch,
  active,
}: {
  renderModeSwitch: (disabled: boolean) => ReactNode;
  active: boolean;
}) {
  const { compactUI, showOrderActions } = useClientGlobal();
  const showActionsPanel = !compactUI || showOrderActions;
  const {
    t,
    recordPayment,
    applyQuantity,
    applyDiscount,
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
    shortcuts,
    removeItem,
    handleAddItem,
    linkedCustomer,
    setLinkedCustomer,
    handleAddBtnClick,
    handleChangeQuantity,
  } = useSaleOrder();
  const addShortcut = (
    <OrderShortcut
      action={shortcuts.add}
      icon={<MdAdd />}
      busy={saving}
      primary
    />
  );
  const footerActions = compactUI && (
    <div className="pos-shortcut-group pos-shortcut-footer">
      {(!transaction?.isPosted() || !showActionsPanel) && (
        <OrderShortcut
          action={shortcuts.voidOrder}
          icon={transaction?.isPosted() ? <MdAdd /> : <MdOutlineCancel />}
          busy={saving}
          danger={!transaction?.isPosted()}
        />
      )}
      {!shortcuts.discount.disabled && (
        <OrderShortcut
          action={shortcuts.discount}
          icon={<MdOutlineLocalOffer />}
          busy={saving}
        />
      )}
      <OrderShortcut
        action={shortcuts.customer}
        icon={<MdPersonAddAlt />}
        busy={saving}
      />
      {!shortcuts.post.disabled && (
        <OrderShortcut
          action={shortcuts.post}
          icon={<MdCheck />}
          busy={saving}
          primary
        />
      )}
    </div>
  );
  const customerDetails = linkedCustomer && (
    <div className="purchase-order-meta sale-order-customer">
      <span>
        {t("ORDER_LINKED_CUSTOMER", { customer: linkedCustomer.getName() })}
      </span>
      <OrderShortcut
        action={{
          children: t("UNLINK_ACTION"),
          onClick: () => setLinkedCustomer(null),
        }}
        icon={<MdClose />}
        busy={saving}
      />
    </div>
  );
  return (
    <>
      {paymentModalOpen && (
        <PaymentForm
          onClose={() => setPaymentModalOpen(false)}
          onApply={recordPayment}
        />
      )}
      {quantityItem && transaction && (
        <QuantityForm
          item={quantityItem}
          onClose={() => setQuantityItem(null)}
          onApply={applyQuantity}
        />
      )}
      {isDiscountModalOpen && transaction && (
        <DiscountForm
          transaction={transaction}
          onClose={() => setDiscountModalOpen(false)}
          onApplied={applyDiscount}
        />
      )}
      <ItemSelectionModal
        preload={active}
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
        handleAddItem={(customer) => {
          if (customer) setLinkedCustomer(customer);
        }}
      />
      <main className="pos-workspace">
        <PageHeader
          title={t("UI_POINT_OF_SALE")}
          eyebrow={t("UI_SALES_WORKSPACE")}
          description={t(
            "UI_ADD_ITEMS_REVIEW_THE_ORDER_AND_COMPLETE_YOUR_TRANSACTION",
          )}
          actions={
            <span
              className={`pos-status${transaction?.isPosted() ? " is-posted" : ""}`}
            >
              {transaction?.isPosted()
                ? t("UI_POSTED_TRANSACTION")
                : transaction
                  ? t("UI_IN_PROGRESS")
                  : t("UI_READY_FOR_A_NEW_SALE")}
            </span>
          }
        />
        <div
          className={`pos-layout${showActionsPanel ? "" : " pos-layout-order-only"}`}
        >
          <section
            className={`pos-order${compactUI ? " pos-compact" : ""}`}
            aria-label={t("UI_CURRENT_ORDER")}
          >
            {renderModeSwitch(saving)}
            {transaction && isPayment ? (
              <TransactionView
                transaction={transaction}
                details={customerDetails}
                footerActions={footerActions}
                activeItem={null}
                onClick={() => {}}
                onDoubleClick={() => {}}
              />
            ) : transaction && transactionState.activeTransactionItem ? (
              <TransactionView
                transaction={transaction}
                activeItem={transactionState.activeTransactionItem}
                compactLines={
                  compactUI && !transaction.isPosted()
                    ? { busy: saving, onRemove: removeItem }
                    : undefined
                }
                headerAction={
                  compactUI && !shortcuts.add.disabled && addShortcut
                }
                details={customerDetails}
                footerActions={footerActions}
                onClick={(transactionItem) => {
                  setTransactionState((t) => ({
                    ...t,
                    activeTransactionItem: transactionItem,
                  }));
                }}
                onDoubleClick={handleChangeQuantity}
              />
            ) : (
              <div className="pos-empty-order">
                <header>
                  <h2>{t("UI_CURRENT_ORDER")}</h2>
                  <span>{t("UI_NO_ITEMS_YET")}</span>
                </header>
                {customerDetails}
                <div className="pos-empty-state">
                  <span className="pos-empty-icon">
                    <MdOutlineShoppingBag aria-hidden="true" />
                  </span>
                  <h3>{t("UI_START_YOUR_NEXT_SALE")}</h3>
                  <p>{t("UI_CHOOSE_AN_ITEM_TO_BUILD_AN_ORDER_YOU_CAN")}</p>
                  {compactUI ? (
                    <div className="pos-shortcut-group pos-empty-shortcuts">
                      <OrderShortcut
                        action={{
                          ...shortcuts.add,
                          children: t("UI_ADD_YOUR_FIRST_ITEM"),
                        }}
                        icon={<MdAdd />}
                        busy={saving}
                        primary
                        labeled
                      />
                      <OrderShortcut
                        action={shortcuts.payment}
                        icon={<MdOutlinePayments />}
                        busy={saving}
                        labeled
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="pos-start-button"
                      disabled={saving}
                      onClick={handleAddBtnClick}
                    >
                      {t("UI_ADD_YOUR_FIRST_ITEM")}
                    </button>
                  )}
                </div>
                <footer className="transaction-details">
                  <span>{text.TOTAL}</span>
                  <Price price={0} />
                </footer>
              </div>
            )}
          </section>
          {showActionsPanel && (
            <OrderActionsPanel
              busy={saving}
              buttons={buttonsProps}
              description={
                isPayment
                  ? t("PAYMENT_NEXT")
                  : transaction?.isPosted()
                    ? t("UI_THIS_SALE_HAS_BEEN_POSTED_START_A_NEW_TRANSACTION")
                    : t("UI_SELECT_AN_ORDER_ITEM_TO_CHANGE_ITS_QUANTITY_OR")
              }
              note={
                isPayment
                  ? t("PAYMENT_DESCRIPTION")
                  : transaction?.isPosted()
                    ? t("UI_POSTED_SALES_ARE_AVAILABLE_IN_HISTORY")
                    : t("UI_POST_SAVES_THE_SALE_ADD_TO_CUSTOMER_SAVES_IT")
              }
            />
          )}
        </div>
      </main>
    </>
  );
}
