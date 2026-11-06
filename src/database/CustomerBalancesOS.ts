import { IDB } from './Database';
export type BalanceFilter = 'owing' | 'settled' | 'credit' | 'all';
export interface CustomerBalance { id: string; name: string; phoneNumber: string; balance: number; timestamp: number }
export interface BalanceOptions { filter: BalanceFilter; search: string; page: number; pageSize: number }

/** Read current derived balances, never reconstruct a customer's transaction history. */
export default class CustomerBalancesOS {
  constructor(private readonly database: IDB) {}
  async getPage(options: BalanceOptions) {
    const db = await this.database.getDatabase();
    return new Promise<{ rows: CustomerBalance[]; total: number; page: number; pageSize: number; outstanding: number; credit: number; owingCount: number }>((resolve, reject) => {
      const transaction = db.transaction(['CUSTOMER', 'CUSTOMER_TRANSACTION_SUMMARIES']);
      const matches: CustomerBalance[] = [];
      let outstanding = 0, credit = 0, owingCount = 0;
      const search = options.search.trim().toLocaleLowerCase();
      transaction.onabort = () => reject(transaction.error);
      transaction.oncomplete = () => {
        matches.sort((a, b) => options.filter === 'credit' ? a.balance - b.balance || a.name.localeCompare(b.name) : b.balance - a.balance || a.name.localeCompare(b.name));
        const pageSize = [0, 10, 25, 50, 100].includes(options.pageSize) ? options.pageSize : 10;
        const size = pageSize || Math.max(1, matches.length);
        const page = pageSize === 0 ? 1 : Math.max(1, Math.min(options.page, Math.max(1, Math.ceil(matches.length / size))));
        resolve({ rows: matches.slice((page - 1) * size, page * size), total: matches.length, page, pageSize, outstanding, credit, owingCount });
      };
      const cursor = transaction.objectStore('CUSTOMER').openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        const customer = entry.value;
        const summary = transaction.objectStore('CUSTOMER_TRANSACTION_SUMMARIES').get(customer.id);
        summary.onsuccess = () => {
          const raw = summary.result?.total ?? 0;
          const balance = Math.abs(raw) < 0.0000001 ? 0 : raw;
          if (balance > 0) { outstanding += balance; owingCount++; }
          if (balance < 0) credit -= balance;
          const included = options.filter === 'all' || (options.filter === 'owing' && balance > 0) || (options.filter === 'credit' && balance < 0) || (options.filter === 'settled' && balance === 0);
          if (included && `${customer.name} ${customer.phoneNumber}`.toLocaleLowerCase().includes(search)) matches.push({ ...customer, balance, timestamp: summary.result?.timestamp ?? 0 });
        };
        entry.continue();
      };
    });
  }
}
