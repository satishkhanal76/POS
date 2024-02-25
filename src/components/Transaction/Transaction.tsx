import { ICustomer } from "../../models/Customer";

import TransactionView from "./TransactionView";
import { ITransaction } from "../../models/Transaction";
import { IDiscountTransactionItem } from "../../models/DiscountTransactionItem";
import { IProductTransactionItem } from "../../models/ProductTransactionItem";

interface TransactionProps {
  transaction: ITransaction;
  activeTransactionItem: IProductTransactionItem | IDiscountTransactionItem;
  handleChangeQuantity: (
    item: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
  onClick: (
    transactionItem: IProductTransactionItem | IDiscountTransactionItem
  ) => void;
}

export interface ITransactionState {
  transaction: ITransaction;
  activeTransactionItem: IProductTransactionItem | IDiscountTransactionItem;
  transactionController: IProductTransactionItem | IDiscountTransactionItem;
  isAddModalOpen: boolean;
  isCustomerModalOpen: boolean;
  customers: ICustomer[];
}

const Transaction = ({
  transaction,
  activeTransactionItem,
  handleChangeQuantity,
  onClick,
}: TransactionProps) => {
  return (
    <>
      <TransactionView
        transaction={transaction}
        onDoubleClick={handleChangeQuantity}
        onClick={onClick}
        activeItem={activeTransactionItem}
      ></TransactionView>
    </>
  );
};

export default Transaction;
