import { IDB } from './Database';
import { ensureListings } from './listing/maintenance';
import { PickerOptions, PickerPage, Usage } from '../pickers/types';
import PickerUsageStore from './PickerUsageStore';
import { ProductSchema } from './ProductOS';
import { ContactSchema } from './ContactOS';

type Record = ProductSchema | ContactSchema;
interface Candidate { id: IDBValidKey; name: string; usage?: Usage; relevance: number }

/** Rank lightweight catalog keys, then read only one bounded page of eligible records. */
export default class PickerStore {
    private readonly usage: PickerUsageStore;
    constructor(private readonly database: IDB) { this.usage = new PickerUsageStore(database); }
    async getPage(table: 'PRODUCTS' | 'CUSTOMER', options: PickerOptions): Promise<PickerPage<Record>> {
        const db = await this.database.getDatabase();
        await ensureListings(db, [table]);
        const needle = options.query.trim().toLocaleLowerCase();
        const usage = !needle && options.recentFirst ? await this.usage.get(options.purchase, options.now) : null;
        const scores = table === 'PRODUCTS' ? usage?.items : usage?.contacts;
        const limit = Math.min(50, Math.max(1, Math.floor(options.limit) || 10));
        const offset = Math.max(0, Math.floor(options.offset) || 0);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(table), store = transaction.objectStore(table);
            transaction.onabort = () => reject(transaction.error);
            const candidates: Candidate[] = [], rows: Record[] = [];
            const cursor = store.index('catalogKeys').openKeyCursor(IDBKeyRange.bound([0], [0, []]));
            cursor.onsuccess = () => {
                const entry = cursor.result;
                if (entry) {
                    const key = entry.key as [number, string, string, string];
                    const searchable = table === 'CUSTOMER' ? `${key[1]} ${key[2]}` : key[1];
                    if (!needle || searchable.includes(needle)) candidates.push({ id: entry.primaryKey, name: key[1], usage: scores?.get(key[3]), relevance: needle && key[1] === needle ? 2 : needle && key[1].startsWith(needle) ? 1 : 0 });
                    entry.continue(); return;
                }
                candidates.sort((a, b) => b.relevance - a.relevance || (b.usage?.count ?? 0) - (a.usage?.count ?? 0) || (b.usage?.latest ?? 0) - (a.usage?.latest ?? 0) || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
                let index = 0, eligible = 0;
                const next = () => {
                    const candidate = candidates[index++];
                    if (!candidate) { resolve({ rows, hasMore: false }); return; }
                    const request = store.get(candidate.id);
                    request.onsuccess = () => {
                        const row = request.result as Record | undefined;
                        if (!row || row.deletedAt || (table === 'PRODUCTS' && (row as ProductSchema)[options.purchase ? 'canPurchase' : 'canSell'] === 0)) { next(); return; }
                        if (eligible++ < offset) { next(); return; }
                        if (rows.length === limit) { resolve({ rows, hasMore: true }); return; }
                        rows.push(row); next();
                    };
                };
                next();
            };
        });
    }
}
