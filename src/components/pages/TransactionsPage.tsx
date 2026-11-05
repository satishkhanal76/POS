import PageHeader from "../Layout/PageHeader";
import React from "react";
import TransactionsView from "../Transactions/TransactionsView";
import { useLocale } from "../../contexts/Locale";

const TransactionsPage = () => {
  const text = useLocale();

  return (
      <>
        <PageHeader title={text.TRANSACTIONS_TITLE} />
        <TransactionsView />
      </>
    );
};

export default TransactionsPage;
