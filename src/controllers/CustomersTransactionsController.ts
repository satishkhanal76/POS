import Controller, { IController } from "./Controller";
import CustomersTransactionsOS, {
  CustomerTransactionsSchema,
} from "../database/CustomersTransactionsOS";
import CustomerTransaction from "../models/CustomerTransaction";
import CustomerTransactions, {
  ICustomerTransactions,
} from "../models/CustomerTransactions";
import Transactions from "../models/Transactions";

export interface ICustomersTransactionsController
  extends IController<
    CustomerTransactionsSchema,
    CustomerTransaction,
    CustomersTransactionsOS
  > {
  getAllItems: () => Promise<ICustomerTransactions[]>;
}

export interface IItemFormData {
  name: string;
  price: number;
}

export default class CustomersTransactionsController
  extends Controller<
    CustomerTransactionsSchema,
    CustomerTransaction,
    CustomersTransactionsOS
  >
  implements ICustomersTransactionsController
{
  constructor(customersTransactionsOS: CustomersTransactionsOS) {
    super(customersTransactionsOS);
  }

  public async getAllItems() {
    const customerTransactions =
      await this.objectStore.getAllCustomersTransactions();
    const customersTransactions: ICustomerTransactions[] = [];

    customerTransactions.forEach((ct) => {
      const foundCT = customersTransactions.find(
        (t) => t.getCustomer().getId() === ct.getCustomer().getId()
      );
      if (foundCT) {
        foundCT.getTransactions().addTransaction(ct.getTransaction());
      } else {
        customersTransactions.push(
          new CustomerTransactions(
            ct.getCustomer(),
            new Transactions([ct.getTransaction()])
          )
        );
      }
    });

    return customersTransactions;
    // return stuffs;
  }
}
