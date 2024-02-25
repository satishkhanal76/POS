import { ReactNode, createContext, useContext } from "react";
import DB, { IDB } from "../database/Database";
import ProductOS, { IProductOS } from "../database/ProductOS";
import CustomerOS, { ICustomerOS } from "../database/CustomerOS";
import TransactionProductsOS, {
  ITransactionProductsOS,
} from "../database/TransactionProductsOS";
import TransactionsOS from "../database/TransactionsOS";
import CustomersTransactionsOS from "../database/CustomersTransactionsOS";
import DiscountOS from "../database/DiscountOS";
import TransactionDiscountsOS from "../database/TransactionDiscountsOS";

interface IDataBaseContext {
  database: IDB;
  itemOS: ProductOS;
  discountOS: DiscountOS;
  customerOS: CustomerOS;
  transactionItemsOS: TransactionProductsOS;
  transactionDiscountsOS: TransactionDiscountsOS;
  transactionsOS: TransactionsOS;
  cutomersTransactionsOS: CustomersTransactionsOS;
}
const database: IDB = new DB();
const itemOS = new ProductOS(database);
const discountOS = new DiscountOS(database);
const customerOS = new CustomerOS(database);
const transactionItemsOS = new TransactionProductsOS(database, itemOS);
const transactionDiscountsOS = new TransactionDiscountsOS(database, discountOS);
const transactionsOS = new TransactionsOS(
  database,
  transactionItemsOS,
  transactionDiscountsOS
);
const cutomersTransactionsOS = new CustomersTransactionsOS(
  database,
  customerOS,
  transactionsOS
);

const values: IDataBaseContext = {
  database,
  itemOS,
  discountOS,
  customerOS,
  transactionItemsOS,
  transactionDiscountsOS,
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
