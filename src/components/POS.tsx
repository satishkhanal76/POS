import { useEffect, useState } from "react";
import "../styles/POS.css";
import CTransaction from "./Transaction/CTransaction";
import TransactionController from "../controllers/TransactionController";
import { useDatabase } from "../contexts/DatabaseContext";
import Transaction, { ITransaction } from "../model/Transaction";
import { v4 as uuidv4 } from "uuid";

interface IPOSState {
  activeTransaction: ITransaction | null;
  viewingTransaction: boolean;
}

const POS = () => {
  const [posState, setPosState] = useState<IPOSState>({
    activeTransaction: null,
    viewingTransaction: false,
  });

  const { transactionOS, itemOS, transactionsOS } = useDatabase();
  let transactionController = new TransactionController(transactionOS);

  useEffect(() => {
    setPosState((p) => ({
      ...p,
      activeTransaction: new Transaction(uuidv4()),
    }));
  }, []);

  const handlePostTransaction = () => {
    if (
      posState.activeTransaction?.getItems() &&
      posState.activeTransaction.getItems().length <= 0
    ) {
      alert("Can't post transaction! Empty");
      return null;
    }
    posState.activeTransaction &&
      transactionController.addTransaction(
        posState.activeTransaction,
        transactionsOS
      );
    setPosState((p) => ({
      ...p,
      activeTransaction: new Transaction(uuidv4()),
    }));
  };

  const handleLoadTransaction = async () => {
    const transaction = await transactionController.getLatestTransaction(
      transactionsOS,
      itemOS,
      posState.viewingTransaction ? posState.activeTransaction : null
    );
    if (!transaction) {
      alert("Out of Transactions!");
      return;
    }
    setPosState((p) => ({
      ...p,
      activeTransaction: transaction,
      viewingTransaction: true,
    }));
  };

  return (
    <div className="pos-container">
      <CTransaction
        onLoadTransaction={handleLoadTransaction}
        onPostTransaction={handlePostTransaction}
        viewingTransaction={posState.viewingTransaction}
        transaction={posState.activeTransaction}
      />
    </div>
  );
};

export default POS;
