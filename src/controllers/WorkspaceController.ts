import { getLocaleText } from '../contexts/Locale';
import { createDatabaseStores } from '../database/DatabaseStores';
import { demoCustomers, demoProducts } from '../data/demoData';
import Customer from '../models/Customer';
import ProductItem from '../models/ProductItem';

const MODE_KEY = 'pos.workspace';
const WELCOME_KEY = 'pos.welcomeSeen';

/** Workspace operations never clear or seed the real POS database. */
class WorkspaceController {
  public isDemo(): boolean {
    try { return sessionStorage.getItem(MODE_KEY) === 'demo'; } catch { return false; }
  }

  public async shouldOfferDemo(): Promise<boolean> {
    if (this.isDemo()) return false;
    if (localStorage.getItem(WELCOME_KEY)) return false;
    const stores = createDatabaseStores();
    const db = await stores.database.getDatabase();
    // Existing users should not receive a first-visit prompt, even if only history remains.
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(Array.from(db.objectStoreNames), 'readonly');
      let hasData = false;
      for (const name of Array.from(db.objectStoreNames)) {
        const request = transaction.objectStore(name).count();
        request.onsuccess = () => { if (request.result) hasData = true; };
      }
      transaction.oncomplete = () => { db.close(); resolve(!hasData); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
  }

  public dismissWelcome(): void { localStorage.setItem(WELCOME_KEY, 'true'); }

  /** Clear every related demo store and optionally seed, together in one transaction. */
  public async resetDemo(seed: boolean): Promise<void> {
    const stores = createDatabaseStores('POS_DEMO');
    const db = await stores.database.getDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(Array.from(db.objectStoreNames), 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error || new Error(getLocaleText('UI_DEMO_RESET_FAILED')));
        for (const name of Array.from(db.objectStoreNames)) transaction.objectStore(name).clear();
        if (seed) {
          const products = transaction.objectStore(stores.itemOS.getObjectStoreName());
          const customers = transaction.objectStore(stores.customerOS.getObjectStoreName());
          demoProducts.forEach(product => products.add(stores.itemOS.getObjectAsSchema(new ProductItem(product))));
          demoCustomers.forEach(customer => customers.add(stores.customerOS.getObjectAsSchema(new Customer(customer))));
        }
      });
    } finally { db.close(); }
  }

  public async startDemo(): Promise<void> {
    await this.resetDemo(true);
    sessionStorage.setItem(MODE_KEY, 'demo');
    this.dismissWelcome();
    window.location.reload();
  }

  public useRealWorkspace(): void {
    sessionStorage.removeItem(MODE_KEY);
    this.dismissWelcome();
    // Reload also drops cached controllers and any unsaved in-memory transaction.
    window.location.reload();
  }
}
export const workspaceController = new WorkspaceController();
