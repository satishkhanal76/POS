import { IDB } from './Database';
import { CustomerSchema } from './CustomerOS';
import { CustomerSummarySchema } from '../models/CustomerTransactionSummary';
import { TransactionsSchema } from './TransactionsOS';
import { CustomerTransactionsSchema } from './CustomersTransactionsOS';
export interface ActivityCustomer extends CustomerSchema { total: number; count: number; timestamp: number }

/** Canonical balances exclude deleted sales. Inclusion is a read-only historical projection. */
export default class CustomerActivityStore {
  constructor(private readonly database: IDB) {}
  async list(includeDeleted = false): Promise<ActivityCustomer[]> {
    const db = await this.database.getDatabase();
    return new Promise((resolve, reject) => {
      const names = ['CUSTOMER', 'CUSTOMER_TRANSACTION_SUMMARIES', ...(includeDeleted ? ['TRANSACTIONS', 'CUSTOMERS_TRANSACTIONS'] : [])];
      const transaction = db.transaction(names);
      let customers: CustomerSchema[] = [], summaries: CustomerSummarySchema[] = [], sales: TransactionsSchema[] = [], links: CustomerTransactionsSchema[] = [];
      const read = <T,>(name: string, save: (rows: T[]) => void) => { const request = transaction.objectStore(name).getAll(); request.onsuccess = () => save(request.result); };
      read<CustomerSchema>('CUSTOMER', rows => { customers = rows; });
      read<CustomerSummarySchema>('CUSTOMER_TRANSACTION_SUMMARIES', rows => { summaries = rows; });
      if (includeDeleted) {
        read<TransactionsSchema>('TRANSACTIONS', rows => { sales = rows; });
        read<CustomerTransactionsSchema>('CUSTOMERS_TRANSACTIONS', rows => { links = rows; });
      }
      transaction.onabort = () => reject(transaction.error);
      transaction.oncomplete = () => {
        const totals = new Map(summaries.map(row => [row.id, row]));
        if (includeDeleted) {
          totals.clear(); const headers = new Map(sales.map(row => [row.id, row]));
          for (const link of links) {
            if (link.deletedAt) continue;
            const sale = headers.get(link.transactionId); if (!sale) continue;
            const row = totals.get(link.customerId) ?? { id: link.customerId, total: 0, count: 0, timestamp: 0 };
            row.total += sale.total; row.count++; row.timestamp = Math.max(row.timestamp, link.timestamp); totals.set(row.id, row);
          }
        }
        resolve(customers.filter(row => includeDeleted || !row.deletedAt).map(customer => ({ ...customer, total: totals.get(customer.id)?.total ?? 0, count: totals.get(customer.id)?.count ?? 0, timestamp: totals.get(customer.id)?.timestamp ?? 0 })));
      };
    });
  }
}
