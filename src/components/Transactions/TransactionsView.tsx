import { useLocaleText } from '../../contexts/Locale';
import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import TransactionController from "../../controllers/TransactionController";
import Price from "../Items/Price";

import { useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../../contexts/Locale";
import { ITransaction } from "../../models/Transaction";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";

interface TransactionsViewProps {
  transactionsOverride?: ITransaction[];
}

const TransactionsView: React.FC<TransactionsViewProps> = ({ transactionsOverride }) => {
  const t = useLocaleText();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

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
    {key: "num-of-items", header: text.TRANSACTION_TABLE_HEADER_NUM_OF_ITEMS, variant: "numeric", render: (transaction) => <>{transaction.getAllTransactionItems().length}</>},
    {key: "total", header: text.TRANSACTION_TABLE_HEADER_TOTAL, variant: "numeric", render: (transaction) => <>{<Price price={transaction.getTotal()} />}</>},
  ] 

  return (
    <CustomTableView label={t('TRANSACTIONS_TITLE')} emptyTitle={t('UI_NO_TRANSACTIONS_YET')} emptyDescription={t('UI_POSTED_SALES_WILL_APPEAR_HERE_CREATE_A_SALE_FROM')} data={transactions} columns={columns} rowKey={(transaction) => transaction.getId()}
      onRowClick={transaction => navigate(`/transaction?id=${encodeURIComponent(transaction.getId())}`, { state: { returnTo: location.pathname + location.search } })}
    />
  );
};

export default TransactionsView;
