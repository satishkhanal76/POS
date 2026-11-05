import DB, { IDB } from "./Database";
import ProductOS from "./ProductOS";
import CustomerOS from "./CustomerOS";
import TransactionProductsOS from "./TransactionProductsOS";
import TransactionsOS from "./TransactionsOS";
import CustomersTransactionsOS from "./CustomersTransactionsOS";
import DiscountOS from "./DiscountOS";
import TransactionDiscountsOS from "./TransactionDiscountsOS";

export interface IDataBaseContext {
  database: IDB;
  itemOS: ProductOS;
  discountOS: DiscountOS;
  customerOS: CustomerOS;
  transactionItemsOS: TransactionProductsOS;
  transactionDiscountsOS: TransactionDiscountsOS;
  transactionsOS: TransactionsOS;
  cutomersTransactionsOS: CustomersTransactionsOS;
}
export function createDatabaseStores(name = "POS"): IDataBaseContext {
  const database: IDB = new DB(name);
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

  return {
    database,
    itemOS,
    discountOS,
    customerOS,
    transactionItemsOS,
    transactionDiscountsOS,
    transactionsOS,
    cutomersTransactionsOS,
  };

}
