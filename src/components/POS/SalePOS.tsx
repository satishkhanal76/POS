import { ReactNode } from "react";
import { MdOutlineShoppingBag } from "react-icons/md";
import "../../styles/POS.css";
import DiscountForm from "../Discount/DiscountForm";
import Price from "../Items/Price";
import PageHeader from "../Layout/PageHeader";
import PaymentForm from "../Transaction/PaymentForm";
import QuantityForm from "../Transaction/QuantityForm";
import TransactionView from "../Transaction/TransactionView";

import CustomerSelectionModal from "../Modals/CustomerSelectionModal";
import ItemSelectionModal from "../Modals/ItemSelectionModal";
import Transaction from "../Transaction/Transaction";
import OrderActionsPanel from "./OrderActionsPanel";

import useSaleOrder from "./useSaleOrder";

export default function SalePOS({
  renderModeSwitch,
  active,
}: {
  renderModeSwitch: (disabled: boolean) => ReactNode;
  active: boolean;
}) {
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
    handleAddItem,
    handleAddCustomer,
    handleAddBtnClick,
    handleChangeQuantity,
  } = useSaleOrder();
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
        handleAddItem={handleAddCustomer}
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
        <div className="pos-layout">
          <section className="pos-order" aria-label={t("UI_CURRENT_ORDER")}>
            {renderModeSwitch(saving)}
            {transaction && isPayment ? (
              <TransactionView
                transaction={transaction}
                activeItem={null}
                onClick={() => {}}
                onDoubleClick={() => {}}
              />
            ) : transaction && transactionState.activeTransactionItem ? (
              <Transaction
                transaction={transaction}
                activeTransactionItem={transactionState.activeTransactionItem}
                onClick={(transactionItem) => {
                  setTransactionState((t) => ({
                    ...t,
                    activeTransactionItem: transactionItem,
                  }));
                }}
                handleChangeQuantity={handleChangeQuantity}
              />
            ) : (
              <div className="pos-empty-order">
                <header>
                  <h2>{t("UI_CURRENT_ORDER")}</h2>
                  <span>{t("UI_NO_ITEMS_YET")}</span>
                </header>
                <div className="pos-empty-state">
                  <span className="pos-empty-icon">
                    <MdOutlineShoppingBag aria-hidden="true" />
                  </span>
                  <h3>{t("UI_START_YOUR_NEXT_SALE")}</h3>
                  <p>{t("UI_CHOOSE_AN_ITEM_TO_BUILD_AN_ORDER_YOU_CAN")}</p>
                  <button
                    type="button"
                    className="pos-start-button"
                    disabled={saving}
                    onClick={handleAddBtnClick}
                  >
                    {t("UI_ADD_YOUR_FIRST_ITEM")}
                  </button>
                </div>
                <footer className="transaction-details">
                  <span>{text.TOTAL}</span>
                  <Price price={0} />
                </footer>
              </div>
            )}
          </section>
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
        </div>
      </main>
    </>
  );
}
