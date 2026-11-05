import PageHeader from "../Layout/PageHeader";
import React from 'react'
import CustomersTransactionsView from '../Customer/CustomersTransactionsView'
import { useLocale } from '../../contexts/Locale'

const CustomersTransactionsPage = () => {
    const text = useLocale();
  return (
    <>
        <PageHeader title={text.CUSTOMERS_TRANSACTIONS_TITLE} />
        <CustomersTransactionsView />
    </>
  )
}

export default CustomersTransactionsPage