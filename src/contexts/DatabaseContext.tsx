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
  transactionOS: TransactionItemsOS;
  transactionsOS: TransactionsOS;
  cutomersTransactionsOS: CustomersTransactionsOS;
}
const database: IDB = new DB();

const values: IDataBaseContext = {
  database: database,
  itemOS: new ItemOS(database),
  customerOS: new CustomerOS(database),
  transactionOS: new TransactionItemsOS(database),
  transactionsOS: new TransactionsOS(database),
  cutomersTransactionsOS: new CustomersTransactionsOS(database),
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
