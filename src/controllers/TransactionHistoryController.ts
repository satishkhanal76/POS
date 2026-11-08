import TransactionHistoryStore, {
  TransactionKindFilter,
} from "../database/TransactionHistoryStore";
import { ITransactionsOS } from "../database/TransactionsOS";
import { PageOptions } from "../database/Pagination";
import { DashboardRange } from "../dashboard/period";
export default class TransactionHistoryController {
  constructor(
    private readonly store: TransactionHistoryStore,
    private readonly transactions: ITransactionsOS,
  ) {}
  async getPage(
    options: PageOptions,
    range: DashboardRange,
    kind?: TransactionKindFilter,
    customerId?: string,
    membership?: "linked" | "unlinked",
  ) {
    const result = await this.store.getPage(
      options,
      range,
      kind,
      customerId,
      membership,
    );
    const ids = result.rows.map((row) => row.id);
    const [rows, contacts] = await Promise.all([
      this.transactions.getListEntries(ids, result.rows),
      this.store.getContacts(ids),
    ]);
    return {
      ...result,
      rows: rows.map((row) => ({
        ...row,
        contacts: contacts.get(row.id) ?? [],
      })),
    };
  }
}
