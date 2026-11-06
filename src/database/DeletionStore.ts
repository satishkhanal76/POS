import { IDB } from './Database';
import { getLocaleText } from '../localization/locale';
import { DELETION_UPDATED } from '../deletion/state';
import { publishStockChange } from '../stock/events';

type Row = { id: string; [key: string]: string | number | undefined };
/** Destructive operations and all derived balance changes share a single write transaction. */
export default class DeletionStore {
  constructor(private readonly database: IDB) {}
  async delete(table: string, id: string, hard = false) {
    const db = await this.database.getDatabase();
    const names = Array.from(db.objectStoreNames);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(names, 'readwrite');
      let message = getLocaleText('DELETE_FAILED');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(message));
      const tables: Record<string, Row[]> = {};
      let pending = names.length;
      const apply = () => {
        const target = tables[table]?.find(row => row.id === id);
        if (!target || (hard && !target.deletedAt)) { message = getLocaleText('DELETE_STALE'); transaction.abort(); return; }
        if (!hard && target.deletedAt) return;
        const transactions = new Set<string>();
        if (table === 'TRANSACTIONS') transactions.add(id);
        if (hard && table === 'PRODUCTS') for (const line of tables.TRANSACTION_PRODUCTS) if (line.productId === id) transactions.add(String(line.transactionId));
        if (hard && table === 'CUSTOMER') for (const link of tables.CUSTOMERS_TRANSACTIONS) if (link.customerId === id && !link.deletedAt) transactions.add(String(link.transactionId));
        for (const sale of tables.TRANSACTIONS) {
          if (!transactions.has(sale.id)) continue;
          if (sale.stockDeducted === 1 && sale.stockReversed !== 1) {
            for (const line of tables.TRANSACTION_PRODUCTS.filter(line => line.transactionId === sale.id)) {
              const stock = tables.STOCK.find(row => row.id === line.productId);
              if (stock) {
                const count = Number(stock.count) + Number(line.quantity);
                if (!Number.isSafeInteger(count)) { transaction.abort(); return; }
                stock.count = count; transaction.objectStore('STOCK').put(stock);
              }
            }
            sale.stockReversed = 1;
          }
          if (!hard) { sale.deletedAt = Date.now(); transaction.objectStore('TRANSACTIONS').put(sale); }
        }
        if (!hard && table !== 'TRANSACTIONS') { target.deletedAt = Date.now(); transaction.objectStore(table).put(target); }
        if (hard) {
          const remove = (name: string, matches: (row: Row) => boolean) => {
            tables[name] = tables[name].filter(row => { if (!matches(row)) return true; transaction.objectStore(name).delete(row.id); return false; });
          };
          remove('TRANSACTIONS', row => transactions.has(row.id));
          for (const name of ['TRANSACTION_PRODUCTS', 'TRANSACTION_DISCOUNTS', 'CUSTOMERS_TRANSACTIONS']) remove(name, row => transactions.has(String(row.transactionId)));
          remove(table, row => row.id === id);
          if (table === 'CUSTOMER') remove('CUSTOMERS_TRANSACTIONS', row => row.customerId === id);
          if (table === 'PRODUCTS') { remove('ITEM_PRICE_CHANGES', row => row.itemId === id); remove('STOCK', row => row.id === id); }
        }
        const sales = new Map(tables.TRANSACTIONS.filter(row => !row.deletedAt).map(row => [row.id, row]));
        const customers = new Set(tables.CUSTOMER.map(row => row.id));
        const summaries = new Map<string, Row>();
        for (const link of tables.CUSTOMERS_TRANSACTIONS) {
          const sale = sales.get(String(link.transactionId));
          if (!sale || link.deletedAt || !customers.has(String(link.customerId))) continue;
          const key = String(link.customerId);
          const summary = summaries.get(key) ?? { id: key, timestamp: 0, count: 0, total: 0 };
          summary.count = Number(summary.count) + 1; summary.total = Number(summary.total) + Number(sale.total);
          summary.timestamp = Math.max(Number(summary.timestamp), Number(link.timestamp)); summaries.set(key, summary);
        }
        const store = transaction.objectStore('CUSTOMER_TRANSACTION_SUMMARIES');
        store.clear(); for (const row of summaries.values()) store.put(row);
      };
      for (const name of names) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => { tables[name] = request.result; if (!--pending) { try { apply(); } catch { transaction.abort(); } } };
      }
    });
    window.dispatchEvent(new Event(DELETION_UPDATED)); publishStockChange();
  }
}
