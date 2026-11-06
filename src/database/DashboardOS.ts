import { IDB } from './Database';
import { TransactionsSchema } from './TransactionsOS';
import { CustomerTransactionsSchema } from './CustomersTransactionsOS';
import { TransactionProductSchema } from './TransactionProductsOS';
import { DashboardRange } from '../dashboard/period';

export interface DashboardEntry extends TransactionsSchema { customerIds: string[]; units: number; products: { id: string; name: string; quantity: number; gross: number }[] }
/** Only scan saved headers in the requested period, and indexed links/lines for those headers. */
export default class DashboardOS {
  constructor(private readonly database: IDB) {}
  async getEntries({ start, end }: DashboardRange): Promise<DashboardEntry[]> {
    const db = await this.database.getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['TRANSACTIONS', 'CUSTOMERS_TRANSACTIONS', 'TRANSACTION_PRODUCTS', 'PRODUCTS', 'ITEM_PRICE_CHANGES']);
      const entries: DashboardEntry[] = [];
      transaction.oncomplete = () => resolve(entries);
      transaction.onabort = () => reject(transaction.error);
      const request = transaction.objectStore('TRANSACTIONS').index('timestamp').openCursor(IDBKeyRange.bound(start, end, false, true));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const entry: DashboardEntry = { ...cursor.value as TransactionsSchema, customerIds: [], units: 0, products: [] };
        entries.push(entry);
        const links = transaction.objectStore('CUSTOMERS_TRANSACTIONS').index('transactionId').getAll(entry.id);
        links.onsuccess = () => { entry.customerIds = [...new Set((links.result as CustomerTransactionsSchema[]).map(link => link.customerId))]; };
        if (entry.kind !== 'payment') {
          const products = transaction.objectStore('TRANSACTION_PRODUCTS').index('transactionId').getAll(entry.id);
          products.onsuccess = () => {
            for (const line of products.result as TransactionProductSchema[]) {
              entry.units += line.quantity;
              const product = transaction.objectStore('PRODUCTS').get(line.productId);
              const price = transaction.objectStore('ITEM_PRICE_CHANGES').index('itemTimestamp').openCursor(IDBKeyRange.bound([line.productId, 0], [line.productId, entry.timestamp]), 'prev');
              price.onsuccess = () => {
                if (!product.result) { transaction.abort(); return; }
                entry.products.push({ id: line.productId, name: product.result.name, quantity: line.quantity, gross: line.quantity * (price.result?.value.amount ?? product.result.amount) });
              };
            }
          };
        }
        cursor.continue();
      };
    });
  }
}
