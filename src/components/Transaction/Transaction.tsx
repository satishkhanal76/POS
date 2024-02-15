import { useEffect, useState } from "react";
import { ITransaction } from "../../model/Transaction";
import { ITransactionItemViewer } from "../../model/TransactionItem";

import SearchableDropDown from "../DropDown/SearchableDropDown";
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
import Customer from "../../model/Customer";
import { v4 as uuidv4 } from "uuid";

interface TransactionProps {}

export interface ITransactionState {
  transaction: ITransaction | null;
  activeTransactionItem: ITransactionItemViewer | null;
  isModalOpen: boolean;
  transactionController: ITransactionController;
}

const Transaction = ({}: TransactionProps) => {
  const {
    transactionOS,
    transactionsOS,
    itemOS,
    customerOS,
    cutomersTransactionsOS,
  } = useDatabase();

  const [transactionState, setTransactionState] = useState<ITransactionState>(
    {} as ITransactionState
  );

  useEffect(() => {
    const transactionController =
      transactionState.transactionController ||
      new TransactionController(transactionOS);

    const loadTransaction = async () => {
      const queryParameters = new URLSearchParams(location.search);
      const id = queryParameters.get("id");
      if (!id) {
        setTransactionState((g) => ({
          ...g,
          transaction: null,
          activeTransactionItem: null,
          isModalOpen: false,
          transactionController: transactionController,
        }));
        return;
      }
      const t = await transactionController.getTransactionById(
        id,
        transactionsOS,
        itemOS
      );
      setTransactionState((g) => ({
        ...g,
        transaction: t,
        activeTransactionItem: null,
        isModalOpen: false,
        transactionController: transactionController,
      }));
      return;
    };

    loadTransaction();
  }, []);

  const { transaction, transactionController } = transactionState;

  const handleAddBtnClick = () => {
    setTransactionState((t) => ({ ...t, isModalOpen: true }));
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
          `How many of ${activeItem.getItem().getName()} would you like?`,
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
      isModalOpen: false,
    }));
  };

  const handleAddItem = (item: IItem) => {
    if (!transaction) return handleCreateNewTransaction(item);

    const transactionItem = transaction.addItem(item);

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transactionItem,
      isModalOpen: false,
    }));
  };

  const handlePostTransaction = async () => {
    if (!transaction || transaction.isPosted()) return;

    await transactionController.postTransaction(transaction, transactionsOS);
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
      transactionsOS,
      itemOS,
      transaction
    );
    if (!prevTransaction) {
      alert("Out of Transactions!");
      return;
    }
    setTransactionState((t) => ({
      ...t,
      transaction: prevTransaction,
      activeTransactionItem: prevTransaction.getLastItem(),
    }));
  };

  const handleAddToCustomer = async () => {
    const customersSchema = await customerOS.getAll();

    const chosenCustomerSchema = customersSchema.find((customerSchema) =>
      confirm(`Would you like to continue with ${customerSchema.name}? `)
    );

    if (!transaction) return;
    if (!chosenCustomerSchema) return;

    const customer = new Customer(chosenCustomerSchema);
    const customerTransaction = new CustomerTransaction({
      id: uuidv4(),
      timestamp: Date.now(),
      customer: customer,
      transaction: transaction,
    });

    cutomersTransactionsOS.addOne(customerTransaction);

    // console.log("ADD TO CUSTOMER");
  };

  const buttonsProps: IButtonProps[] = [
    {
      children: "Add",
      disabled: transaction?.isPosted() ? true : false,
      onClick: handleAddBtnClick,
    },
    {
      children: "Remove",
      disabled:
        transaction?.isPosted() || !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleRemoveBtnClick,
    },
    {
      children: "Change Quantity",
      disabled:
        transaction?.isPosted() || !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleChangeQuantity,
    },
    {
      children: "Post Transaction",
      disabled:
        transaction?.isPosted() || !transaction?.hasItems() ? true : false,
      onClick: handlePostTransaction,
    },
    {
      children: "Load Prev Transaction",
      disabled: transaction && !transaction.isPosted() ? true : false,
      onClick: handleLoadPrevTransaction,
    },
    {
      children: transaction?.isPosted()
        ? "Create new Transaction"
        : "Void Transaction",
      disabled: !transaction ? true : false,
      onClick: transaction?.isPosted()
        ? () => handleCreateNewTransaction()
        : handleVoidTransaction,
    },
    {
      children: "Add To Customer",
      disabled: !transaction?.isPosted() ? true : false,
      onClick: handleAddToCustomer,
    },
  ];

  return (
    <>
      {transactionState.isModalOpen && (
        <SearchableDropDown handleAdd={handleAddItem} />
      )}
      <TransactionButtons
        buttonsClassName="big-button"
        buttonsClassNameWhenActive="big-button active"
        buttonsProps={buttonsProps}
      />

      <div className="transaction-container">
        <div className="transaction-title">
          {transaction
            ? `Transaction - ${new Date(
                transaction.getTimestamp()
              ).toISOString()} `
            : `No Active Transaction - Add Item`}
        </div>

        <TransactionsItemsContainer
          transactionItems={transaction?.getItems() || []}
          activeItem={transactionState.activeTransactionItem}
          onDoubleClick={handleChangeQuantity}
          onClick={(transactionItem) =>
            setTransactionState((t) => ({
              ...t,
              activeTransactionItem: transactionItem,
            }))
          }
          total={transaction?.getTotal() || 0}
        />
      </div>
    </>
  );
};

export default Transaction;
