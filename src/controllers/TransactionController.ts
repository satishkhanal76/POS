import TransactionsOS, { TransactionsSchema } from "../database/TransactionsOS";
import Transaction, {
  ITransaction,
  ITransactionViewer,
} from "../model/Transaction";

import Controller, { IController } from "./Controller";
import { v4 as uuidv4 } from "uuid";

interface TransactionControllerI<S, I, OS> extends IController<S, I, OS> {}

export interface ITransactionController {
  /**
   * Posts a transaction to the database
   * @param transaction transaction to be posted
   * @param transactionsOS
   * @returns
   */
  postTransaction: (transaction: ITransaction) => Promise<ITransactionViewer>;

  getLatestTransaction: (
    currenltyViewingTransaction: ITransactionViewer | null
  ) => Promise<ITransaction | null>;

  getNewTransaction: () => ITransaction;

  getTransactionById: (id: string) => Promise<ITransaction | null>;
}

export default class TransactionController
  extends Controller<TransactionsSchema, Transaction, TransactionsOS>
  implements
    TransactionControllerI<TransactionsSchema, Transaction, TransactionsOS>
{
  constructor(transactionsOS: TransactionsOS) {
    super(transactionsOS);
  }

  public async postTransaction(
    transaction: Transaction
  ): Promise<ITransactionViewer> {
    return this.objectStore.postTransaction(transaction);
  }

  public async getLatestTransaction(
    currenltyViewingTransaction: ITransactionViewer | null
  ): Promise<ITransaction | null> {
    const schema = await this.objectStore.getLatestTransaction(
      currenltyViewingTransaction
    );
    return schema;
  }

  public getNewTransaction() {
    return new Transaction(uuidv4());
  }

  public async getTransactionById(id: string) {
    return await this.getOne(id);
  }
}
