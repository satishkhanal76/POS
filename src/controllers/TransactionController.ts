import TransactionsOS, { TransactionsSchema } from "../database/TransactionsOS";
import Transaction, { ITransaction } from "../models/Transaction";
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
  postTransaction: (transaction: ITransaction) => Promise<ITransaction | null>;

  getLatestTransaction: (
    currenltyViewingTransaction: ITransaction | null
  ) => Promise<ITransaction | null>;

  getNewTransaction: () => ITransaction;

  getTransactionById: (id: string) => Promise<ITransaction | null>;
  getAllTransactionsByTimestamp: () => Promise<ITransaction[]>;

  getAllAsJSONString: () => Promise<string>;
}

export default class TransactionController
  extends Controller<TransactionsSchema, Transaction, TransactionsOS>
  implements
    TransactionControllerI<TransactionsSchema, Transaction, TransactionsOS>,
    ITransactionController
{
  #transaction: Transaction;
  constructor(transactionsOS: TransactionsOS) {
    super(transactionsOS);
    this.#transaction = this.getNewTransaction();
  }

  public async getAllTransactionsByTimestamp(): Promise<ITransaction[]> {
    return await this.objectStore.getAllTransactionsByTimestamp();
  }

  public async postTransaction(
    transaction: ITransaction
  ): Promise<ITransaction | null> {
    if (transaction.getId() === this.#transaction.getId()) {
      return this.objectStore.postTransaction(this.#transaction);
    }
    return null;
  }

  public async getLatestTransaction(
    currenltyViewingTransaction: ITransaction | null
  ): Promise<ITransaction | null> {
    const transaction = await this.objectStore.getLatestTransaction(
      currenltyViewingTransaction
    );
    if (transaction) {
      this.#transaction = transaction;
    }
    return transaction;
  }

  public getNewTransaction() {
    return (this.#transaction = new Transaction(uuidv4()));
  }

  public async getTransactionById(id: string) {
    return (this.#transaction = await this.getOne(id));
  }

  public async getAllAsJSONString() {
    return this.objectStore.getAllAsJSONString();
  }
}
