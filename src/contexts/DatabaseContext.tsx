import { ReactNode, createContext, useContext } from "react";
import DB, { IDB } from "../database/Database";
import ItemOS, { IItemOS } from "../database/ItemOS";
import CustomerOS, { ICustomerOS } from "../database/CustomerOS";
import TransactionItemsOS, {
  ITransactionItemsOS,
} from "../database/TransactionItemsOS";
import TransactionsOS from "../database/TransactionsOS";
import CustomersTransactionsOS from "../database/CustomersTransactionsOS";

interface IDataBaseContext {
  database: IDB;
  itemOS: ItemOS;
  customerOS: CustomerOS;
  transactionItemsOS: TransactionItemsOS;
  transactionsOS: TransactionsOS;
  cutomersTransactionsOS: CustomersTransactionsOS;
}
const database: IDB = new DB();
const itemOS = new ItemOS(database);
const customerOS = new CustomerOS(database);
const transactionItemsOS = new TransactionItemsOS(database, itemOS);
const transactionsOS = new TransactionsOS(database, transactionItemsOS);
const cutomersTransactionsOS = new CustomersTransactionsOS(
  database,
  customerOS,
  transactionsOS
);

const values: IDataBaseContext = {
  database,
  itemOS,
  customerOS,
  transactionItemsOS,
  transactionsOS,
  cutomersTransactionsOS,
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
