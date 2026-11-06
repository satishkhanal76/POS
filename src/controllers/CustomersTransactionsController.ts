import { v4 as uuidv4 } from "uuid";
import { ICustomer } from "../models/Customer";
import { ITransaction } from "../models/Transaction";
import { getLocaleText } from "../localization/locale";
import { PageOptions } from "../database/Pagination";
import CustomerTransactionSummariesOS from "../database/CustomerTransactionSummariesOS";
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
  constructor(customersTransactionsOS: CustomersTransactionsOS, private readonly summaries?: CustomerTransactionSummariesOS) {
    super(customersTransactionsOS);
  }

  public async getLinkedCustomer(transactionId: string) {
    return this.objectStore.getLinkedCustomer(transactionId);
  }

  public async unlinkTransaction(transactionId: string, customerId: string) {
    return this.objectStore.unlinkTransaction(transactionId, customerId);
  }

  /** Link an already posted sale without posting or changing its historical amounts. */
  public async linkTransaction(transaction: ITransaction, customer: ICustomer) {
    if (!transaction.isPosted()) throw new Error(getLocaleText('TRANSACTION_LINK_REQUIRES_POSTED'));
    return this.objectStore.addOne(new CustomerTransaction({
      id: uuidv4(), timestamp: Date.now(), transaction, customer,
    }));
  }

  public async getPage(customerId: string, options: PageOptions) { return this.objectStore.getPage(customerId, options); }
  public async getSummaryPage(options: PageOptions) {
    if (!this.summaries) throw new Error(getLocaleText('PAGINATION_SUMMARIES_MISSING'));
    return this.summaries.getPage(options);
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
  
  public async getCustomerTransactions(customerId: string) {
    return this.objectStore.getCustomerTransactions(customerId);
    
  }
}
