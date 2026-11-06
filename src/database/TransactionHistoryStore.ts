import { IDB } from './Database';
import { PageOptions, PageResult } from './Pagination';
import { TransactionsSchema } from './TransactionsOS';
import { CustomerTransactionsSchema } from './CustomersTransactionsOS';
import { DashboardRange } from '../dashboard/period';

export type TransactionKindFilter = 'sale' | 'payment';
/** Date filtering always uses the original transaction timestamp, never the later link timestamp. */
export default class TransactionHistoryStore {
  constructor(private readonly database: IDB) {}
  async getPage(options: PageOptions, range: DashboardRange, kind?: TransactionKindFilter, customerId?: string): Promise<PageResult<TransactionsSchema>> {
    const db = await this.database.getDatabase();
    const transaction = db.transaction(['TRANSACTIONS', 'CUSTOMERS_TRANSACTIONS']);
    const index = transaction.objectStore('TRANSACTIONS').index('timestamp');
    const bound = range.all ? undefined : IDBKeyRange.bound(range.start, range.end, false, true);
    // Filtering requires a header scan; retain only the requested page plus the last page for clamping.
    return new Promise((resolve, reject) => {
      const pageSize = [0, 10, 25, 50, 100].includes(options.pageSize) ? options.pageSize : 10;
      const requestedPage = pageSize === 0 ? 1 : Math.max(1, Math.floor(options.page) || 1);
      const rows: TransactionsSchema[] = [], lastPage: TransactionsSchema[] = [];
      let total = 0;
      transaction.onabort = () => reject(transaction.error);
      transaction.oncomplete = () => {
        const page = pageSize === 0 ? 1 : Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
        resolve({ rows: page === requestedPage ? rows : lastPage, total, page, pageSize });
      };
      const request = index.openCursor(bound, options.sort === 'oldest' ? 'next' : 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const header = cursor.value as TransactionsSchema;
        if (header.deletedAt && !options.includeDeleted) { cursor.continue(); return; }
        const accept = () => {
          if (pageSize && total % pageSize === 0) lastPage.length = 0;
          lastPage.push(header);
          if (!pageSize || Math.floor(total / pageSize) + 1 === requestedPage) rows.push(header);
          total++; cursor.continue();
        };
        if (kind && (header.kind ?? 'sale') !== kind) { cursor.continue(); return; }
        if (!customerId) { accept(); return; }
        const links = transaction.objectStore('CUSTOMERS_TRANSACTIONS').index('transactionId').getAll(header.id);
        links.onsuccess = () => (links.result as CustomerTransactionsSchema[]).some(link => link.customerId === customerId) ? accept() : cursor.continue();
      };
    });
  }
}
