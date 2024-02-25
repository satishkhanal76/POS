import React, { useEffect, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import TransactionController from "../../controllers/TransactionController";
import Price from "../Items/Price";

import "./Transactions.css";
import { Link } from "react-router-dom";
import { IButtonProps } from "../Button";
import { useLocale } from "../../contexts/Locale";
import { ITransaction } from "../../models/Transaction";

const Transactions = () => {
  const text = useLocale();
  const { transactionsOS } = useDatabase();

  const transactionController = new TransactionController(transactionsOS);

  const [transactions, setTransactions] = useState<ITransaction[]>([]);

  useEffect(() => {
    const loadAllTransactions = async () => {
      const allTransactions =
        await transactionController.getAllTransactionsByTimestamp();

      setTransactions((t) => allTransactions);
    };

    loadAllTransactions();
  }, []);

  return (
    <>
      <h1 className="transaction-title">Transactions</h1>
      <div className="transactions-container">
        <div className="transaction">
          <div className="transaction-date">{"Time"}</div>
          <div className="transaction-items">{"Num Of Items"}</div>
          <div className="transaction-total">{"Total"}</div>
        </div>
        {transactions.map((transaction, i) => {
          return (
            <Link key={i} to={`/transaction?id=${transaction.getId()}`}>
              <div className="transaction">
                <div className="transaction-date">
                  {new Date(transaction.getTimestamp()).toLocaleString()}
                </div>
                <div className="transaction-items">
                  {transaction.getAllTransactionItems().length}
                </div>
                <div className="transaction-total">
                  <Price price={transaction.getTotal()}></Price>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default Transactions;
