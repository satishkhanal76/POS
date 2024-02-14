import { MouseEventHandler, useEffect, useState } from "react";
import { ITransaction } from "../../model/Transaction";
import { ITransactionItemViewer } from "../../model/TransactionItem";

import CTransactionButtons from "./CTransactionButtons";
import SearchableDropDown from "../DropDown/SearchableDropDown";
import { IItem } from "../../model/Item";
import CTransactionItem from "./CTransactionItem";
import "./Transaction.css";
import IntegerValidator from "../../validators/IntegerValidator";
import TransactionButtons from "./TransactionButtons";
import { IButtonProps } from "../Button";

interface CTransactionProps {
  transaction: ITransaction | null;
  viewingTransaction: boolean;
  onPostTransaction: () => void;
  onLoadTransaction: () => void;
  onVoidTransaction: () => void;

  /**
   * Is called when user adds an item but there is no active transaction
   * @param item the item user wants to add on the new transaction
   * @returns
   */
  onCreateNewTransaction: (item?: IItem) => void;
}

interface ITransactionState {
  transaction: ITransaction | null;
  activeTransactionItem: ITransactionItemViewer | null;
  isModalOpen: boolean;
  canEditTransaction: boolean;
}

const CTransaction = ({
  transaction,
  viewingTransaction,
  onPostTransaction: handlePostTransaction,
  onLoadTransaction: handleLoadTransaction,
  onVoidTransaction,
  onCreateNewTransaction,
}: CTransactionProps) => {
  const [transactionState, setTransactionState] = useState<ITransactionState>({
    transaction: transaction,
    activeTransactionItem: null,
    isModalOpen: false,
    canEditTransaction: transaction && !viewingTransaction ? true : false,
  });

  useEffect(() => {
    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transaction?.getLastItem() || null,
      isModalOpen: false,
      canEditTransaction: transaction && !viewingTransaction ? true : false,
    }));
  }, [transaction]);

  const transactionItems = transaction?.getItems();

  const handleAddBtnClick = () => {
    setTransactionState((t) => ({ ...t, isModalOpen: true }));
  };
  const handleRemoveBtnClick = () => {
    if (!transaction) return;

    transaction.removeItem(
      transactionState.activeTransactionItem?.getItem().getId() || ""
    );
    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transaction.getLastItem(),
    }));
  };

  const handleChangeQuantity = () => {
    if (!transaction) return;
    const activeItem = transactionState.activeTransactionItem;
    if (!activeItem) return;

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
        activeItem,
        itemQuantity.getSerializedValue()
      );
    }

    setTransactionState((t) => ({ ...t }));
  };

  const handleAddItem = (item: IItem) => {
    if (!transaction) {
      onCreateNewTransaction(item);
      return;
    }

    const transactionItem = transaction.addItem(item);

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transactionItem,
      isModalOpen: false,
    }));
  };

  const handleCreateNewTransaction = () => {
    onCreateNewTransaction();
  };

  const buttonsProps: IButtonProps[] = [
    {
      children: "Add",
      disabled: viewingTransaction ? true : false,
      onClick: handleAddBtnClick,
    },
    {
      children: "Remove",
      disabled:
        transactionState.canEditTransaction &&
        transactionState.activeTransactionItem
          ? false
          : true,
      onClick: handleRemoveBtnClick,
    },
    {
      children: "Post Transactions",
      disabled:
        transaction && !viewingTransaction && transaction.getItems().length > 0
          ? false
          : true,
      onClick: handlePostTransaction,
    },
    {
      children: "Change Quantity",
      disabled:
        !transactionState.canEditTransaction ||
        !transactionState.activeTransactionItem
          ? true
          : false,
      onClick: handleChangeQuantity,
    },
    {
      children: "Load Prev Transaction",
      disabled:
        transaction && transactionState.canEditTransaction ? true : false,
      onClick: handleLoadTransaction,
    },
    {
      children: viewingTransaction
        ? "Crete new Transaction"
        : "Void Transaction",
      disabled:
        viewingTransaction || transactionState.canEditTransaction
          ? false
          : true,
      onClick: viewingTransaction
        ? handleCreateNewTransaction
        : onVoidTransaction,
    },
  ];

  return (
    <>
      <TransactionButtons
        buttonsClassName="big-button"
        buttonsClassNameWhenActive="big-button active"
        buttonsProps={buttonsProps}
      />
      {transactionState.isModalOpen && (
        <SearchableDropDown handleAdd={handleAddItem} />
      )}

      <div className="transaction-container">
        <div className="transaction-title">
          {viewingTransaction && "Viewing "}
          {transaction
            ? `Transaction - ${new Date(
                transaction.getTimestamp()
              ).toISOString()} `
            : `No Active Transaction - Add Item`}
        </div>
        <div className="transaction-items-container">
          {transactionItems &&
            transactionItems.map((transactionItem) => (
              <CTransactionItem
                key={transactionItem.getItem().getId()}
                transactionItem={transactionItem}
                isActiveTransactionItem={
                  transactionState.activeTransactionItem === transactionItem
                }
                handleClick={() => {
                  setTransactionState((t) => ({
                    ...t,
                    activeTransactionItem: transactionItem,
                  }));
                }}
              />
            ))}
        </div>
        <div className="transaction-details">
          <span>Total</span>
          <span>${transaction ? transaction.getTotal() : 0}</span>
        </div>
      </div>
    </>
  );
};

export default CTransaction;
