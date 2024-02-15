import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomerTransaction, {
  ICustomerTransaction,
} from "../../model/CustomerTransaction";
import TransactionController, {
  ITransactionController,
} from "../../controllers/TransactionController";
import Customer from "../../model/Customer";
import { CustomersTransactionsSchema } from "../../database/CustomersTransactionsOS";

import "./Customer.css";

interface CustomersTransactionsState {
  customersTransactions: (ICustomerTransaction | null)[];
}

const CustomersTransactions = () => {
  const {
    cutomersTransactionsOS,
    transactionOS,
    transactionsOS,
    itemOS,
    customerOS,
  } = useDatabase();
  const transactionController: ITransactionController =
    new TransactionController(transactionOS);

  const [customersTransactionsState, setCustomersTransactionsState] =
    useState<CustomersTransactionsState>({
      customersTransactions: [],
    } as CustomersTransactionsState);

  useEffect(() => {
    const func = async () => {
      const cts = await cutomersTransactionsOS.getAll();
      let customerTransactionsReq;
      customerTransactionsReq = cts.map(
        async (ct: CustomersTransactionsSchema) => {
          const transaction = await transactionController.getTransactionById(
            ct.transactionId,
            transactionsOS,
            itemOS
          );
          const customerSchema = await customerOS.getOne(ct.customerId);
          if (!customerSchema || !transaction) return null;
          const customer = new Customer(customerSchema);
          const cutomertransaction: ICustomerTransaction =
            new CustomerTransaction({
              id: ct.id,
              customer,
              timestamp: ct.timestamp,
              transaction,
            });
          return cutomertransaction || null;
        }
      );

      let customerTransactions = await Promise.all(customerTransactionsReq);

      setCustomersTransactionsState((g) => ({
        ...g,
        customersTransactions: customerTransactions,
      }));
    };

    func();
  }, []);
  return (
    <div className="customers-transactions-controller">
      <div className="customer-transaction">
        <span>Customer Name</span>
        <span>Total</span>
        <span>Date</span>
      </div>

      {customersTransactionsState.customersTransactions.map((ct, i) => {
        return (
          <div key={i} className="customer-transaction">
            <span className="customer-name">{ct?.getCustomer().getName()}</span>
            <span className="customer-total">
              ${ct?.getTransaction().getTotal()}
            </span>
            <span className="transaction-date">
              {new Date(ct?.getTimestamp() || "").toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CustomersTransactions;
