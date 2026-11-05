import { Link } from "react-router-dom";
import "./TransactionPage.css";
import PageHeader from "../Layout/PageHeader";
import React, { useEffect, useState } from 'react'
import { useDatabase } from '../../contexts/DatabaseContext';
import CustomersTransactionsController from '../../controllers/CustomersTransactionsController';
import TransactionsView from '../Transactions/TransactionsView';
import { rt, useLocale } from '../../contexts/Locale';
import { ICustomerTransaction } from '../../models/CustomerTransaction';
import { ICustomer } from '../../models/Customer';

const CustomerTransactionsPage = () => {

  const text = useLocale();

  const { cutomersTransactionsOS, customerOS } = useDatabase();
  const customersTransactionsController = new CustomersTransactionsController(
    cutomersTransactionsOS
  );

  const [customer, setCustomer] = useState<ICustomer>();
  const [customerTransactions, setCustomerTransactions] = useState<ICustomerTransaction[]>();



  const loadCustomerTransacions = () => {
      const queryParameters = new URLSearchParams(location.search);
      const customerId: string | null = queryParameters.get("id");

      if(!customerId) return;
      customerOS.getOne(customerId).then(setCustomer);
      customersTransactionsController.getCustomerTransactions(customerId).then(setCustomerTransactions);
  };
  


  useEffect(() => {
    loadCustomerTransacions()
  }, []);

  return (
    <main className="transaction-page">
      <Link className="transaction-back-link" to="/customers-transactions">← Back to Customer Transactions</Link>
      <PageHeader title={customer ? rt(text.CUSTOMER_TRANSACTIONS_TITLE, { CUSTOMER_NAME: customer.getName() }) : "Customer Transactions"} />
      {customerTransactions
        ? <TransactionsView transactionsOverride={customerTransactions.map(t => t.getTransaction())} />
        : <p role="status">Loading customer transactions…</p>}
    </main>
  )
}

export default CustomerTransactionsPage