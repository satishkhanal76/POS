import { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import { rt, useLocale } from "../../contexts/Locale";
import TransactionController, {
  ITransactionController,
} from "../../controllers/TransactionController";
import { ICustomer } from "../../models/Customer";
import CustomerController from "../../controllers/CustomerController";
import { IButtonProps } from "../Button";
import TransactionButtons from "../Transaction/TransactionButtons";
import { ITransaction } from "../../models/Transaction";
import { ITransactionItem } from "../../models/TransactionItem";
import ProductItem from "../../models/ProductItem";
import DiscountItem from "../../models/DiscountItem";
import Transaction from "../Transaction/Transaction";
export interface ITransactionState {
  transaction: ITransaction | null;
  activeTransactionItem: ITransactionItem<ProductItem | DiscountItem> | null;
  transactionController: ITransactionController;
  isAddModalOpen: boolean;
  isCustomerModalOpen: boolean;
  customers: ICustomer[];
}

const TransactionPage = () => {
  const text = useLocale();

  const { transactionsOS, customerOS } = useDatabase();

  const [transactionState, setTransactionState] = useState<ITransactionState>(
    {} as ITransactionState
  );
  const transactionController =
    transactionState.transactionController ||
    new TransactionController(transactionsOS);

  useEffect(() => {
    const loadTransaction = async () => {
      const queryParameters = new URLSearchParams(location.search);
      const id = queryParameters.get("id");
      if (!id) {
        alert("No transaction provided");
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

  const { transaction, activeTransactionItem } = transactionState;

  const handleChangeQuantity = () => {};

  const handleLoadPrevTransaction = async () => {
    const prevTransaction = await transactionController.getLatestTransaction(
      transaction
    );
    if (!prevTransaction) {
      alert(text.OUT_OF_TRANSACTIONS);
      return;
    }

    setTransactionState((t) => ({
      ...t,
      transaction: prevTransaction,
      activeTransactionItem: prevTransaction.getLast(),
    }));
  };

  const buttonsProps: IButtonProps[] = [
    {
      children: text.BUTTON_LOAD_PREV_TRANASACTION,
      disabled: false,
      onClick: handleLoadPrevTransaction,
    },
  ];

  return (
    <>
      <TransactionButtons
        buttonsClassName="big-button"
        buttonsClassNameWhenActive="big-button active"
        buttonsProps={buttonsProps}
      />
      {transaction && activeTransactionItem && (
        <Transaction
          transaction={transaction}
          activeTransactionItem={activeTransactionItem}
          onClick={(transactionItem) => {
            setTransactionState((t) => ({
              ...t,
              activeTransactionItem: transactionItem,
            }));
          }}
          handleChangeQuantity={handleChangeQuantity}
        />
      )}
      ;
    </>
  );
};

export default TransactionPage;
