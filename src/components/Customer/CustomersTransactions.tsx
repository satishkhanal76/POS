import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";

import "./Customer.css";
import CustomersTransactionsController from "../../controllers/CustomersTransactionsController";
import { ICustomerTransactions } from "../../model/CustomerTransactions";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import { useLocale } from "../../contexts/Locale";
import Price from "../Items/Price";

interface CustomersTransactionsState {
  customersTransactions: (ICustomerTransactions | null)[];
}

const CustomersTransactions = () => {
  const { currencyCharacter } = useClientGlobal();
  const text = useLocale();
  const { cutomersTransactionsOS } = useDatabase();
  const customersTransactionsController = new CustomersTransactionsController(
    cutomersTransactionsOS
  );

  const [customersTransactionsState, setCustomersTransactionsState] =
    useState<CustomersTransactionsState>({
      customersTransactions: [],
    } as CustomersTransactionsState);

  useEffect(() => {
    const func = async () => {
      const cts = await customersTransactionsController.getAllItems();

      setCustomersTransactionsState((g) => ({
        ...g,
        customersTransactions: cts,
      }));
    };

    func();
  }, []);
  return (
    <div className="customers-transactions-controller">
      <div className="customer-transaction">
        <span>{text.CUSTOMER_NAME}</span>
        <span>{text.TOTAL}</span>
      </div>

      {customersTransactionsState.customersTransactions.map((ct, i) => {
        return (
          <div key={i} className="customer-transaction">
            <span className="customer-name">{ct?.getCustomer().getName()}</span>
            <Price
              className="customer-total"
              price={ct?.getTransactions().getTotal() || 0}
            ></Price>
          </div>
        );
      })}
    </div>
  );
};

export default CustomersTransactions;
