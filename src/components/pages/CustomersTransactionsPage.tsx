import React from 'react'
import CustomersTransactionsView from '../Customer/CustomersTransactionsView'
import { useLocale } from '../../contexts/Locale'

const CustomersTransactionsPage = () => {
    const text = useLocale();
  return (
    <>
        <div className='page-title-container'>
            <h2>{text.CUSTOMERS_TRANSACTIONS_TITLE}</h2>
        </div>
        <CustomersTransactionsView />
    </>
  )
}

export default CustomersTransactionsPage