import { useDatabase } from "../contexts/DatabaseContext";
import { IItemOS } from "../database/ItemOS";
import TransactionItemsOS, {
  ITransactionItemsOS,
  TransactionItemsSchema,
} from "../database/TransactionItemsOS";
import { ITransactionsOS } from "../database/TransactionsOS";
import { IItem, Item } from "../model/Item";
import Transaction, {
  ITransaction,
  ITransactionCreator,
  ITransactionViewer,
} from "../model/Transaction";
import TransactionItem, {
  ITransactionItemViewer,
} from "../model/TransactionItem";
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
  postTransaction: (
    transaction: ITransaction,
    transactionsOS: ITransactionsOS
  ) => Promise<ITransactionViewer>;

  getLatestTransaction: (
    transactionsOS: ITransactionsOS,
    itemOS: IItemOS,
    currenltyViewingTransaction: ITransactionViewer | null
  ) => Promise<ITransaction | null>;

  getNewTransaction: () => ITransaction;

  getTransactionById: (
    id: string,
    transactionsOS: ITransactionsOS,
    itemOS: IItemOS
  ) => Promise<ITransaction | null>;
}

export default class TransactionController
  extends Controller<
    TransactionItemsSchema,
    ITransactionItemViewer,
    TransactionItemsOS
  >
  implements
    TransactionControllerI<
      TransactionItemsSchema,
      ITransactionItemViewer,
      ITransactionItemsOS
    >
{
  constructor(transactionOS: TransactionItemsOS) {
    super(transactionOS);
  }

  public async postTransaction(
    transaction: ITransaction,
    transactionsOS: ITransactionsOS
  ): Promise<ITransactionViewer> {
    if (transaction.isPosted())
      throw new Error("Transaction is already posted!");
    const transationItems: ITransactionItemViewer[] = transaction.getItems();

    await this.addMany(transationItems);
    return transactionsOS.addOne(transaction);
  }

  private async getTransaction(
    t: ITransactionCreator,
    itemOS: IItemOS
  ): Promise<ITransaction> {
    const transaction: ITransactionCreator = t;

    const transactionSchemas =
      await this.objectStore.getTransactionItemsAsSchema(transaction);

    const transactionItemsReq = transactionSchemas.map(
      async (schema) =>
        new TransactionItem({
          ...schema,
          item: new Item(await itemOS.getOne(schema.itemId)),
        })
    );

    const transactionItems = await Promise.all(transactionItemsReq);

    transaction.addTransactionItems(transactionItems);

    return transaction;
  }

  public getTransactionItemsAsSchema(
    transaction: ITransaction
  ): Promise<TransactionItemsSchema[]> {
    return this.objectStore.getTransactionItemsAsSchema(transaction);
  }

  public async getLatestTransaction(
    transactionsOS: ITransactionsOS,
    itemOS: IItemOS,
    currenltyViewingTransaction: ITransactionViewer | null
  ): Promise<ITransaction | null> {
    const schema = await transactionsOS.getLatestTransaction(
      currenltyViewingTransaction
    );
    if (!schema) return null;
    const transaction = new Transaction(schema?.id, schema?.timestamp);
    transaction.setIsPosted(true);
    return this.getTransaction(transaction, itemOS);
  }

  public getNewTransaction() {
    return new Transaction(uuidv4());
  }

  public async getTransactionById(
    id: string,
    transactionOS: ITransactionsOS,
    itemOS: IItemOS
  ) {
    const schema = await transactionOS.getOne(id);
    if (!schema) return null;
    const transaction = new Transaction(schema.id, schema.timestamp);
    transaction.setIsPosted(true);
    return this.getTransaction(transaction, itemOS);
  }
}
