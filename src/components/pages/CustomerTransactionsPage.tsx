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
    <>
      <div className='page-title-container'>
        <h2>{rt(text.CUSTOMER_TRANSACTIONS_TITLE, {
          CUSTOMER_NAME: customer?.getName()
        })}</h2>
      </div>
      <TransactionsView transactionsOverride={customerTransactions?.map(t => t.getTransaction())}/>
    </>
  )
}

export default CustomerTransactionsPage