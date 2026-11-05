import { useLocaleText } from '../contexts/Locale';
import PageHeader from "./Layout/PageHeader";
import "../styles/POS.css";
import Price from "./Items/Price";
import { MdOutlineShoppingBag } from "react-icons/md";
import { useEffect, useState } from "react";

import { v4 as uuidv4 } from "uuid";
import TransactionController, {
  ITransactionController,
} from "../controllers/TransactionController";
import { ICustomer } from "../models/Customer";
import { rt, useLocale } from "../contexts/Locale";
import { useDatabase } from "../contexts/DatabaseContext";
import CustomerController from "../controllers/CustomerController";
import IntegerValidator from "../validators/IntegerValidator";
import CustomerTransaction from "../models/CustomerTransaction";
import { IButtonProps } from "./Button";
import TransactionButtons from "./Transaction/TransactionButtons";
import CustomerSelectionModal from "./Modals/CustomerSelectionModal";
import ItemSelectionModal from "./Modals/ItemSelectionModal";
import Transaction from "./Transaction/Transaction";
import { ITransaction } from "../models/Transaction";
import { IProductTransactionItem } from "../models/ProductTransactionItem";
import { IDiscountTransactionItem } from "../models/DiscountTransactionItem";
import DiscountItem, {
  DiscountItemParams,
  DiscountItemType,
} from "../models/DiscountItem";
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
  const text = useLocale();

  const { transactionsOS, customerOS, cutomersTransactionsOS, discountOS, itemOS } =
    useDatabase();


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

  const handleChangeQuantity = () => {
    if (!transaction || !transactionState.activeTransactionItem) return;
    if (transaction.isPosted()) return;

    const activeItem = transactionState.activeTransactionItem;

    if (!activeItem?.getIsQuantityChangable()) return;

    let itemQuantity: IntegerValidator;

    do {
      itemQuantity = new IntegerValidator(
        prompt(
          rt(text.PROMPT_CHANGE_QUANTITY, {
            ITEM_NAME: activeItem.getItem().getName(),
          }),
          activeItem.getQuantity().toString()
        ),
        { minValue: 1 }
      );
      if (itemQuantity.isValueNull()) return; //user doesnot want to change the quantitiy
    } while (!itemQuantity.isValueValid()); //if user provides string

    if (itemQuantity.getSerializedValue() <= 0) {
      transaction.removeTransactionItem(activeItem.getItem().getId());
    } else {
      transaction.changeTransactionItemQuantity(
        activeItem.getItem().getId(),
        itemQuantity.getSerializedValue()
      );
    }

    setTransactionState((t) => ({ ...t }));
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
    if (!item) return;

    if (!transaction) return handleCreateNewTransaction(item);

    const pricedItem = await itemOS.getAtTimestamp(item.getId(), transaction.getTimestamp());
    const transactionItem = transaction.addProductItem(pricedItem);

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transactionItem,
      isAddModalOpen: false,
    }));
  };

  const handlePostTransaction = async () => {
    if (!transaction || transaction.isPosted()) return;

    await transactionController.postTransaction(transaction);
    setTransactionState((t) => ({
      ...t,
      transaction: null,
      activeTransactionItem: null,
    }));
  };

  const handleVoidTransaction = () => {
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

  const handleDiscount = async () => {
    if (!transaction) return;
    let integerValidator: IntegerValidator;
    do {
      integerValidator = new IntegerValidator(
        prompt(text.DISCOUNT_PROMPT_MESSAGE),
        {
          minValue: 1,
        }
      );
      if (integerValidator.isValueNull()) return;
    } while (!integerValidator.isValueValid());

    const discount = new DiscountItem({
      id: uuidv4(),
      name: `Owner Discount`,
      amount: integerValidator.getSerializedValue(),
      discountType: DiscountItemType.PERCENTAGE,
    } as DiscountItemParams);

    discountOS.addOne(discount);

    const discountTransactionItem = transaction.addDiscountItem(discount);

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: discountTransactionItem,
    }));
  };

  const handleAddCustomer = async (customer: ICustomer | null) => {
    const transaction = transactionState.transaction;
    if (!transaction) return;

    await transactionController.postTransaction(transaction);
    if (!customer) return;
    if (!transaction) return;

    const customerTransaction = new CustomerTransaction({
      id: uuidv4(),
      timestamp: Date.now(),
      customer,
      transaction,
    });

    cutomersTransactionsOS.addOne(customerTransaction);

    alert(
      rt(text.TRANSACTION_LINKED_TO_CUSTOMER_SUCCESS, {
        CUSTOMER_NAME: customer.getName(),
      })
    );

    handleCreateNewTransaction();
    setTransactionState((t) => ({
      ...t,
      transaction: null,
      activeTransactionItem: null,
      isCustomerModalOpen: false,
    }));
  };

  const buttonsProps: IButtonProps[] = [
    {
      children: text.BUTTON_ADD,
      className: "pos-action pos-action-add",
      disabled: transaction?.isPosted() ? true : false,
      onClick: handleAddBtnClick,
    },
    {
      children: text.BUTTON_REMOVE,
      disabled:
        transaction?.isPosted() || !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleRemoveBtnClick,
    },
    {
      children: text.BUTTON_CHANGE_QUANTITY,
      disabled:
        transaction?.isPosted() || !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleChangeQuantity,
    },
    {
      children: text.BUTTON_POST_TRANSACTION,
      className: "pos-action pos-action-primary",
      disabled:
        transaction?.isPosted() || !transaction?.hasItems() ? true : false,
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
      disabled: !transaction ? true : false,
      onClick: handleDiscount,
    },
  ];

  return (
    <>
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
            {transaction && transactionState.activeTransactionItem ? (
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
                  <button type="button" className="pos-start-button" onClick={handleAddBtnClick}>{t('UI_ADD_YOUR_FIRST_ITEM')}</button>
                </div>
                <footer className="transaction-details"><span>{text.TOTAL}</span><Price price={0} /></footer>
              </div>
            )}
          </section>
          <aside className="pos-actions-panel" aria-labelledby="pos-actions-title">
            <h2 id="pos-actions-title">{t('UI_ORDER_ACTIONS')}</h2>
            <p>{transaction?.isPosted() ? t('UI_THIS_SALE_HAS_BEEN_POSTED_START_A_NEW_TRANSACTION') : t('UI_SELECT_AN_ORDER_ITEM_TO_CHANGE_ITS_QUANTITY_OR')}</p>
            <TransactionButtons
              buttonsClassName="pos-action"
              buttonsClassNameWhenActive="pos-action"
              buttonsProps={buttonsProps}
            />
            <div className="pos-actions-note">{transaction?.isPosted() ? t('UI_POSTED_SALES_ARE_AVAILABLE_IN_HISTORY') : t('UI_POST_SAVES_THE_SALE_ADD_TO_CUSTOMER_SAVES_IT')}</div>
          </aside>
        </div>
      </main>
    </>
  );
};

export default POS;
