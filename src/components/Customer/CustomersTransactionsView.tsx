import { useLocaleText } from '../../contexts/Locale';
import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";

import CustomersTransactionsController from "../../controllers/CustomersTransactionsController";
import { ICustomerTransactions } from "../../models/CustomerTransactions";
import { useLocale } from "../../contexts/Locale";
import Price from "../Items/Price";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import { useNavigate } from "react-router-dom";


const CustomersTransactionsView = () => {
  const t = useLocaleText();
  const navigate = useNavigate();
  const text = useLocale();
  const { cutomersTransactionsOS } = useDatabase();
  const customersTransactionsController = new CustomersTransactionsController(
    cutomersTransactionsOS
  );

  const [customersTransactions, setCustomersTransactions] =
    useState<ICustomerTransactions[]>([]);

  const loadCustomersTransactions =  () => {
     customersTransactionsController.getAllItems().then(setCustomersTransactions);
  };

  useEffect(() => {
    loadCustomersTransactions();
  }, []);

  const columns: CustomTableColumn<ICustomerTransactions>[] = [
      {key: "name", header: text.CUSTOMER_TABLE_HEADER_NAME, render: (customerTransaction) => <>{customerTransaction.getCustomer().getName()}</>},
      {key: "total-num-of-transaction", header: text.CUSTOMERS_TRANSACTIONS_NUM_OF_TRANS, variant: "numeric", render: (customerTransaction) => <>{customerTransaction.getTransactions().getAllTransactions().length}</>},
      {key: "total", header: text.CUSTOMERS_TRANSACTIONS_TOTAL, variant: "numeric", render: (customerTransaction) => <>{<Price price={customerTransaction.getTransactions().getTotal()} />}</>},
    ];
    
  return (
    <CustomTableView label={t('UI_CUSTOMER_TRANSACTIONS')} emptyTitle={t('UI_NO_CUSTOMER_SALES_YET')} emptyDescription={t('UI_SALES_SAVED_AGAINST_A_CUSTOMER_WILL_APPEAR_HERE')} onRowClick={customerTransaction => navigate(`/customer-transactions?id=${customerTransaction.getCustomer().getId()}`)} data={customersTransactions} columns={columns} rowKey={customerTransaction => customerTransaction.getCustomer().getId()} />
  );
};

export default CustomersTransactionsView;
