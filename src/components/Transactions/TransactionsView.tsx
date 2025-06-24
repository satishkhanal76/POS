import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import TransactionController from "../../controllers/TransactionController";
import Price from "../Items/Price";

import { Link, useNavigate } from "react-router-dom";
import { useLocale } from "../../contexts/Locale";
import { ITransaction } from "../../models/Transaction";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";

interface TransactionsViewProps {
  transactionsOverride?: ITransaction[];
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ transactionsOverride }) => {
  const text = useLocale();
  const navigate = useNavigate();

  const { transactionsOS } = useDatabase();

  const transactionController = new TransactionController(transactionsOS);

  const [transactions, setTransactions] = useState<ITransaction[]>([]);

  useEffect(() => {
    if (!transactionsOverride) {
      const loadAllTransactions = async () => {
        const allTransactions =
          await transactionController.getAllTransactionsByTimestamp();

        setTransactions(allTransactions);
      };

      loadAllTransactions();
    } else {
      setTransactions(transactionsOverride);
    }
  }, [transactionsOverride]);

  const columns: CustomTableColumn<ITransaction>[] = [
    {key: "name", header: text.TRANSACTION_TABLE_HEADER_TIME, render: (transaction) => <>{new Date(transaction.getTimestamp()).toLocaleString()}</>},
    {key: "num-of-items", header: text.TRANSACTION_TABLE_HEADER_NUM_OF_ITEMS, render: (transaction) => <>{transaction.getAllTransactionItems().length}</>},
    {key: "total", header: text.TRANSACTION_TABLE_HEADER_TOTAL, render: (transaction) => <>{<Price price={transaction.getTotal()} />}</>},
  ] 

  return (
    <CustomTableView data={transactions} columns={columns} rowKey={(transaction) => transaction.getId()}
      onRowClick={transaction => navigate(`/transaction?id=${transaction.getId()}`)}
    />
  );
};

export default TransactionsView;
