import TransactionHistoryStore, { TransactionKindFilter } from '../database/TransactionHistoryStore';
import { ITransactionsOS } from '../database/TransactionsOS';
import { PageOptions } from '../database/Pagination';
import { DashboardRange } from '../dashboard/period';
export default class TransactionHistoryController {
  constructor(private readonly store: TransactionHistoryStore, private readonly transactions: ITransactionsOS) {}
  async getPage(options: PageOptions, range: DashboardRange, kind?: TransactionKindFilter, customerId?: string) {
    const result = await this.store.getPage(options, range, kind, customerId);
    return { ...result, rows: await this.transactions.getListEntries(result.rows.map(row => row.id)) };
  }
}
