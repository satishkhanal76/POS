import { indexedCatalog } from './catalog';
import { indexedHeader, indexedLink, indexedSummary, LISTING_VERSION } from './metadata';
import { indexedPriceChange } from './priceHistory';
import { getLocaleText } from '../../contexts/Locale';

export const MAINTENANCE_EVENT = 'pos:database-maintenance';
export const listingTables = ['PRODUCTS', 'CUSTOMER', 'CUSTOMER_TRANSACTION_SUMMARIES', 'ITEM_PRICE_CHANGES', 'TRANSACTIONS', 'CUSTOMERS_TRANSACTIONS', 'PURCHASES', 'SUPPLIER_PAYMENTS'] as const;
export interface MaintenanceProgress { table: string; completed: number; total: number; failed?: boolean; blocked?: boolean }
interface Checkpoint { version: number; done?: boolean; lastKey?: string; completed: number }
// Development hot reloads must not orphan a running job or hide its progress.
const hot = import.meta.hot?.data;
const previous = hot?.listingMaintenance as { version: number; active: Map<string, Map<string, MaintenanceProgress>>; running: WeakMap<IDBDatabase, Map<string, Promise<void>>>; ready: WeakMap<IDBDatabase, Set<string>> } | undefined;
const state = previous?.version === LISTING_VERSION ? previous : {
    version: LISTING_VERSION,
    active: new Map<string, Map<string, MaintenanceProgress>>(),
    running: new WeakMap<IDBDatabase, Map<string, Promise<void>>>(),
    ready: new WeakMap<IDBDatabase, Set<string>>(),
};
if (hot) hot.listingMaintenance = state;
const { active, running, ready } = state;
const checkpointKey = (database: IDBDatabase, table: string) => `pos.indexing.${database.name}.${table}`;
function checkpoint(database: IDBDatabase, table: string): Checkpoint {
    try { const value = JSON.parse(localStorage.getItem(checkpointKey(database, table)) ?? 'null'); if (value?.version === LISTING_VERSION) return value; } catch { /* Memory state still supports restricted storage. */ }
    return { version: LISTING_VERSION, completed: 0 };
}
function save(database: IDBDatabase, table: string, value: Checkpoint) {
    try { localStorage.setItem(checkpointKey(database, table), JSON.stringify(value)); } catch { /* Indexing can finish without persistent checkpoints. */ }
}
function progress(name: string, table: string, value?: MaintenanceProgress) {
    let operations = active.get(name);
    if (!operations) { operations = new Map(); active.set(name, operations); }
    if (value) operations.set(table, value); else operations.delete(table);
    window.dispatchEvent(new Event(MAINTENANCE_EVENT));
}
export function databaseProgress(name: string): MaintenanceProgress | null {
    const operations = active.get(name);
    return operations?.get('connection') ?? operations?.values().next().value ?? null;
}
export function databaseBlocked(name: string, blocked: boolean) {
    progress(name, 'connection', blocked ? { table: 'connection', completed: 0, total: 0, blocked: true } : undefined);
}
export function markListingsReady(database: IDBDatabase) {
    ready.set(database, new Set(listingTables));
    for (const table of listingTables) {
        save(database, table, { version: LISTING_VERSION, done: true, completed: 0 });
        progress(database.name, table);
    }
}

/** Run outside versionchange. Each checkpoint commits independently and never edits canonical values. */
export async function ensureListings(database: IDBDatabase, tables: readonly string[]) {
    for (const table of tables) {
        if (ready.get(database)?.has(table)) continue;
        if (checkpoint(database, table).done) {
            let tables = ready.get(database); if (!tables) { tables = new Set(); ready.set(database, tables); } tables.add(table); progress(database.name, table); continue;
        }
        let jobs = running.get(database);
        if (!jobs) { jobs = new Map(); running.set(database, jobs); }
        let job = jobs.get(table);
        if (!job) {
            job = rebuild(database, table);
            jobs.set(table, job);
            const clear = () => jobs!.delete(table);
            void job.then(clear, clear);
        }
        await job;
    }
}
async function rebuild(database: IDBDatabase, table: string) {
    let saved = checkpoint(database, table);
    const total = await new Promise<number>((resolve, reject) => {
        const count = database.transaction(table).objectStore(table).count();
        count.onsuccess = () => resolve(count.result); count.onerror = () => reject(count.error);
    });
    try {
        while (!ready.get(database)?.has(table)) {
            // Another tab or a restore can complete this table while this job is yielding.
            if (checkpoint(database, table).done) {
                let tables = ready.get(database); if (!tables) { tables = new Set(); ready.set(database, tables); } tables.add(table);
                progress(database.name, table); return;
            }
            progress(database.name, table, { table, completed: Math.min(saved.completed, total), total });
            const result = await rebuildBatch(database, table, saved.lastKey);
            saved = { version: LISTING_VERSION, completed: saved.completed + result.count, lastKey: result.lastKey, done: result.done };
            save(database, table, saved);
            if (result.done) {
                let tables = ready.get(database); if (!tables) { tables = new Set(); ready.set(database, tables); } tables.add(table);
                progress(database.name, table); return;
            }
            // Release locks and let another page or a backup use the database between batches.
            await new Promise<void>(resolve => setTimeout(resolve, 16));
        }
    } catch (error) {
        progress(database.name, table, { table, completed: Math.min(saved.completed, total), total, failed: true });
        throw error;
    }
}
function rebuildBatch(database: IDBDatabase, table: string, lastKey?: string) {
    return new Promise<{ count: number; lastKey?: string; done: boolean }>((resolve, reject) => {
        const dependencies = table === 'TRANSACTIONS' ? ['TRANSACTION_PRODUCTS', 'TRANSACTION_DISCOUNTS', 'CUSTOMERS_TRANSACTIONS'] : table === 'CUSTOMER_TRANSACTION_SUMMARIES' ? ['CUSTOMER'] : table === 'ITEM_PRICE_CHANGES' ? ['PRODUCTS'] : [];
        const transaction = database.transaction([table, ...dependencies], 'readwrite');
        const store = transaction.objectStore(table);
        let count = 0, key = lastKey, done = false, failure: unknown;
        transaction.oncomplete = () => resolve({ count, lastKey: key, done });
        transaction.onabort = () => reject(failure ?? transaction.error ?? new Error(getLocaleText('DATABASE_INDEX_FAILED')));
        const request = store.getAll(lastKey === undefined ? undefined : IDBKeyRange.lowerBound(lastKey, true), 100);
        request.onsuccess = () => {
            const rows = request.result;
            done = rows.length < 100;
            key = rows.length ? String(rows[rows.length - 1].id) : lastKey;
            for (const row of rows) {
            const next = () => { count++; };
            const put = (value: object) => { try { const write = store.put(value); write.onsuccess = next; } catch (error) { failure = error; transaction.abort(); } };
            try {
                // New writes and previously prepared records need no line/link rescans.
                if (row.listVersion === LISTING_VERSION) { next(); continue; }
                switch (table) {
                    case 'PRODUCTS': case 'CUSTOMER': put(indexedCatalog(row)); break;
                    case 'CUSTOMERS_TRANSACTIONS': put(indexedLink(row)); break;
                    case 'PURCHASES': case 'SUPPLIER_PAYMENTS': put(indexedHeader(row, table === 'PURCHASES' ? 'purchase' : 'supplier-payment')); break;
                    case 'CUSTOMER_TRANSACTION_SUMMARIES': {
                        const contact = transaction.objectStore('CUSTOMER').get(row.id);
                        contact.onsuccess = () => put(indexedSummary(row, contact.result?.deletedAt)); break;
                    }
                    case 'ITEM_PRICE_CHANGES': {
                        const item = transaction.objectStore('PRODUCTS').get(row.itemId);
                        item.onsuccess = () => put(indexedPriceChange(row, item.result?.deletedAt)); break;
                    }
                    case 'TRANSACTIONS': {
                        const products = transaction.objectStore('TRANSACTION_PRODUCTS').index('transactionId').count(row.id);
                        const discounts = transaction.objectStore('TRANSACTION_DISCOUNTS').index('transactionId').count(row.id);
                        const links = transaction.objectStore('CUSTOMERS_TRANSACTIONS').index('transactionId').getAll(row.id);
                        let pending = 3;
                        const save = () => { if (--pending) return; put(indexedHeader(row, row.kind ?? 'sale', links.result.filter((link: { deletedAt?: number }) => !link.deletedAt).map((link: { customerId: string }) => link.customerId), products.result + discounts.result)); };
                        products.onsuccess = discounts.onsuccess = links.onsuccess = save; break;
                    }
                    default: next();
                }
            } catch (error) { failure = error; transaction.abort(); break; }
            }
        };
    });
}
