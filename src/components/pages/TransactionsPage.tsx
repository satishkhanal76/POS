import React from "react";
import TransactionsView from "../Transactions/TransactionsView";
import { useLocale } from "../../contexts/Locale";

const TransactionsPage = () => {
  const text = useLocale();

  return (
      <>
        <div className="page-title-container">
          <h2>{text.TRANSACTIONS_TITLE}</h2>
        </div>
        <TransactionsView />
      </>
    );
};

export default TransactionsPage;
