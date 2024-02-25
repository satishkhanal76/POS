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
import CustomerSelectionModal from "./Customer/CustomerSelectionModal";
import ItemSelectionModal from "./Transaction/ItemSelectionModal";
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
  const text = useLocale();

  const { transactionsOS, customerOS, cutomersTransactionsOS, discountOS } =
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

  const handleCreateNewTransaction = (item?: ProductItem) => {
    const t = transactionController.getNewTransaction();
    let transactionItem:
      | IProductTransactionItem
      | IDiscountTransactionItem
      | null;
    if (item) {
      transactionItem = t.addProductItem(item);
    }
    setTransactionState((p) => ({
      ...p,
      transaction: t,
      activeTransactionItem: transactionItem,
      isAddModalOpen: false,
    }));
  };

  const handleAddItem = (item: ProductItem | null) => {
    if (!item) return;

    if (!transaction) return handleCreateNewTransaction(item);

    const transactionItem = transaction.addProductItem(item);

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

  const handleLoadPrevTransaction = async () => {
    const prevTransaction = await transactionController.getLatestTransaction(
      transaction
    );
    if (!prevTransaction) {
      alert(text.OUT_OF_TRANSACTIONS);
      return;
    }

    updateURL(prevTransaction);
    setTransactionState((t) => ({
      ...t,
      transaction: prevTransaction,
      activeTransactionItem: prevTransaction.getLast(),
    }));
  };

  const updateURL = (transaction: ITransaction) => {
    const url = new URL(window.location.toString() + "transaction");
    url.searchParams.set("id", transaction.getId());
    history.pushState({}, "", url);
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
      disabled:
        transaction?.isPosted() || !transaction?.hasItems() ? true : false,
      onClick: handlePostTransaction,
    },
    {
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
        isModalOpen={transactionState.isAddModalOpen}
        handleAddItem={handleAddItem}
      />
      <CustomerSelectionModal
        isModalOpen={transactionState.isCustomerModalOpen}
        handleAddItem={handleAddCustomer}
      />
      <TransactionButtons
        buttonsClassName="big-button"
        buttonsClassNameWhenActive="big-button active"
        buttonsProps={buttonsProps}
      />
      {!transaction && <h2>{text.INACTIVE_TRANSACTION_TITLE}</h2>}
      {transaction && transactionState.activeTransactionItem && (
        <Transaction
          transaction={transaction}
          activeTransactionItem={transactionState.activeTransactionItem || null}
          onClick={(transactionItem) => {
            setTransactionState((t) => ({
              ...t,
              activeTransactionItem: transactionItem,
            }));
          }}
          handleChangeQuantity={handleChangeQuantity}
        />
      )}
    </>
  );
};

export default POS;
