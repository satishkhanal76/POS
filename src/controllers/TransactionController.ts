import { IItemOS } from "../database/ItemOS";
import TransactionOS, {
  ITransactionOS,
  TransactionSchema,
} from "../database/TransactionOS";
import { ITransactionsOS } from "../database/TransactionsOS";
import { Item } from "../model/Item";
import Transaction, { ITransaction } from "../model/Transaction";
import TransactionItem, {
  ITransactionItemViewer,
} from "../model/TransactionItem";
import Controller, { IController } from "./Controller";
import { v4 as uuidv4 } from "uuid";

export interface ITransactionController<S, I, OS>
  extends IController<S, I, OS> {
  addTransaction: (
    transaction: ITransaction,
    transactionsOS: ITransactionsOS
  ) => Promise<ITransactionItemViewer[]>;

  getTransaction: (
    transaction: ITransaction,
    itemOS: IItemOS
  ) => Promise<ITransaction>;
}

export default class TransactionController
  extends Controller<TransactionSchema, ITransactionItemViewer, TransactionOS>
  implements
    ITransactionController<
      TransactionSchema,
      ITransactionItemViewer,
      ITransactionOS
    >
{
  constructor(transactionOS: TransactionOS) {
    super(transactionOS);
  }

  public async addTransaction(
    transaction: ITransaction,
    transactionsOS: ITransactionsOS
  ) {
    const transationItems: ITransactionItemViewer[] = transaction.getItems();

    await transactionsOS.addOne(transaction);
    return this.addMany(transationItems);
  }

  public async getTransaction(
    t: ITransaction,
    itemOS: IItemOS
  ): Promise<ITransaction> {
    const transaction: ITransaction = t;

    const transactionSchemas =
      await this.objectStore.getTransactionItemsAsSchema(transaction);

    const transactionItemReq = transactionSchemas.map(async (schema) => {
      return new TransactionItem({
        ...schema,
        item: new Item(await itemOS.getOne(schema.itemId)),
      });
    });

    const transactionItems = await Promise.all(transactionItemReq);

    transactionItems.forEach((transactionItem) =>
      transaction.addTransactionItem(transactionItem)
    );

    return transaction;
  }

  public getTransactionItemsAsSchema(
    transaction: ITransaction
  ): Promise<TransactionSchema[]> {
    return this.objectStore.getTransactionItemsAsSchema(transaction);
  }

  public async getLatestTransaction(
    transactionsOS: ITransactionsOS,
    itemOS: IItemOS,
    currenltyViewingTransaction: ITransaction | null
  ): Promise<ITransaction | null> {
    const schema = await transactionsOS.getLatestTransaction(
      currenltyViewingTransaction
    );
    if (!schema) return null;
    const transaction = new Transaction(schema?.id, schema?.timestamp);
    return this.getTransaction(transaction, itemOS);
  }
}
