import { useEffect, useState } from "react";
import { ITransaction } from "../../model/Transaction";
import { ITransactionItemViewer } from "../../model/TransactionItem";

import CTransactionButtons from "./CTransactionButtons";
import SearchableDropDown from "../DropDown/SearchableDropDown";
import { IItem } from "../../model/Item";
import CTransactionItem from "./CTransactionItem";
import "./Transaction.css";
import IntegerValidator from "../../validators/IntegerValidator";

interface CTransactionProps {
  transaction: ITransaction | null;
  viewingTransaction: boolean;
  onPostTransaction: () => void;
  onLoadTransaction: () => void;
}

interface ITransactionState {
  activeTransactionItem: ITransactionItemViewer | null;
  isModalOpen: boolean;
}

const CTransaction = ({
  transaction,
  viewingTransaction,
  onPostTransaction,
  onLoadTransaction,
}: CTransactionProps) => {
  const [transactionState, setTransactionState] = useState<ITransactionState>({
    activeTransactionItem: null,
    isModalOpen: false,
  });

  useEffect(() => {
    setTransactionState((p) => ({
      ...p,
      activeTransactionItem: transaction?.getLastItem() || null,
      isModalOpen: false,
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
    if (!transaction) return;

    const transactionItem = transaction.addItem(item);

    setTransactionState((t) => ({
      ...t,
      activeTransactionItem: transactionItem,
      isModalOpen: false,
    }));
  };

  return (
    <>
      <CTransactionButtons
        onLoadTransaction={onLoadTransaction}
        onPostTransaction={onPostTransaction}
        viewingTransaction={transaction && !viewingTransaction ? true : false}
        onAdd={handleAddBtnClick}
        onRemove={handleRemoveBtnClick}
        onChangeQuantity={handleChangeQuantity}
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
            : `Transaction`}
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
