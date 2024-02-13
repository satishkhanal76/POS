import { ReactNode, createContext, useContext } from "react";
import DB, { IDB } from "../database/Database";
import ItemOS, { IItemOS } from "../database/ItemOS";
import CustomerOS, { ICustomerOS } from "../database/CustomerOS";
import TransactionOS, { ITransactionOS } from "../database/TransactionOS";
import TransactionsOS from "../database/TransactionsOS";

interface IDataBaseContext {
  database: IDB;
  itemOS: ItemOS;
  customerOS: CustomerOS;
  transactionOS: TransactionOS;
  transactionsOS: TransactionsOS;
}
const database: IDB = new DB();

const values: IDataBaseContext = {
  database: database,
  itemOS: new ItemOS(database),
  customerOS: new CustomerOS(database),
  transactionOS: new TransactionOS(database),
  transactionsOS: new TransactionsOS(database),
};

export const DatabaseContext = createContext<IDataBaseContext>(values);

interface IDatabaseProvider {
  children: ReactNode;
}

export function useDatabase() {
  return useContext(DatabaseContext);
}

export function DatabaseProvider({ children }: IDatabaseProvider) {
  return (
    <DatabaseContext.Provider value={values}>
      {children}
    </DatabaseContext.Provider>
  );
}
