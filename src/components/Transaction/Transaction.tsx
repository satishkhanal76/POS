import { useEffect, useState } from "react";
import { ITransaction } from "../../model/Transaction";
import { ITransactionItemViewer } from "../../model/TransactionItem";

import { IItem } from "../../model/Item";
import "./Transaction.css";
import IntegerValidator from "../../validators/IntegerValidator";
import TransactionButtons from "./TransactionButtons";
import { IButtonProps } from "../Button";
import TransactionController, {
  ITransactionController,
} from "../../controllers/TransactionController";
import { useDatabase } from "../../contexts/DatabaseContext";
import TransactionsItemsContainer from "./TransactionsItemsContainer";
import CustomerTransaction from "../../model/CustomerTransaction";
import { ICustomer } from "../../model/Customer";
import { v4 as uuidv4 } from "uuid";
import CustomerController from "../../controllers/CustomerController";
import ItemSelectionModal from "./ItemSelectionModal";
import CustomerSelectionModal from "../Customer/CustomerSelectionModal";
import { rt, useLocale } from "../../contexts/Locale";
import TransactionView from "./TransactionView";

interface TransactionProps {}

export interface ITransactionState {
  transaction: ITransaction | null;
  activeTransactionItem: ITransactionItemViewer | null;
  transactionController: ITransactionController;
  isAddModalOpen: boolean;
  isCustomerModalOpen: boolean;
  customers: ICustomer[];
}

const Transaction = ({}: TransactionProps) => {
  const text = useLocale();

  const { transactionsOS, customerOS, cutomersTransactionsOS, itemOS } =
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
        activeTransactionItem: null,
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

    transaction.removeItem(
      transactionState.activeTransactionItem.getItem().getId()
    );

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transaction.getLastItem(),
    }));
  };

  const handleChangeQuantity = () => {
    if (!transaction || !transactionState.activeTransactionItem) return;
    if (transaction.isPosted()) return;

    const activeItem = transactionState.activeTransactionItem;

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
      transaction.removeItem(activeItem.getItem().getId());
    } else {
      transaction.changeItemQuantity(
        activeItem.getItem().getId(),
        itemQuantity.getSerializedValue()
      );
    }

    setTransactionState((t) => ({ ...t }));
  };

  const handleCreateNewTransaction = (item?: IItem) => {
    const t = transactionController.getNewTransaction();
    let transactionItem: ITransactionItemViewer | null;
    if (item) {
      transactionItem = t.addItem(item);
    }
    setTransactionState((p) => ({
      ...p,
      transaction: t,
      activeTransactionItem: transactionItem,
      isAddModalOpen: false,
    }));
  };

  const handleAddItem = (item: IItem | null) => {
    if (!item) return;

    if (!transaction) return handleCreateNewTransaction(item);

    const transactionItem = transaction.addItem(item);

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
      activeTransactionItem: prevTransaction.getLastItem(),
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

  const handleAddCustomer = async (customer: ICustomer | null) => {
    const transaction = transactionState.transaction;
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
    setTransactionState((t) => ({ ...t, isCustomerModalOpen: false }));
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
      children: text.BUTTON_LOAD_PREV_TRANASACTION,
      disabled: transaction && !transaction.isPosted() ? true : false,
      onClick: handleLoadPrevTransaction,
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
      disabled: !transaction?.isPosted() ? true : false,
      onClick: selectCustomer,
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

      {transactionState.transaction &&
        transactionState.activeTransactionItem && (
          <TransactionView
            transaction={transactionState.transaction}
            onDoubleClick={handleChangeQuantity}
            onClick={(transactionItem) => {
              setTransactionState((t) => ({
                ...t,
                activeTransactionItem: transactionItem,
              }));
            }}
            activeItem={transactionState.activeTransactionItem}
          ></TransactionView>
        )}
    </>
  );
};

export default Transaction;
