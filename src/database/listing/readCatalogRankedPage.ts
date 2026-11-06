import { PageOptions, PageResult } from '../Pagination';

interface RankedKey { id: IDBValidKey; name: string; value: number | null; originalPrice?: number; sellable?: number }

/** Sort current price/stock metadata before paging; hydrate only the selected catalog rows. */
export default function readCatalogRankedPage<T>(store: IDBObjectStore, options: PageOptions, search: string): Promise<PageResult<T>> {
    return new Promise((resolve, reject) => {
        const size = [0, 10, 25, 50, 100].includes(options.pageSize) ? options.pageSize : 10;
        const state = options.includeDeleted ? 1 : 0, needle = search.trim().toLocaleLowerCase();
        const candidates: RankedKey[] = [];
        const request = store.index('catalogKeys').openKeyCursor(IDBKeyRange.bound([state], [state, []]));
        request.onerror = () => reject(request.error);
        const finish = () => {
            const ascending = options.sort.endsWith('-low');
            candidates.sort((a, b) => {
                if (a.value === null && b.value !== null) return 1;
                if (b.value === null && a.value !== null) return -1;
                const difference = (a.value ?? 0) - (b.value ?? 0);
                return (ascending ? difference : -difference) || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id));
            });
            const total = candidates.length;
            const page = size ? Math.min(Math.max(1, Math.floor(options.page) || 1), Math.max(1, Math.ceil(total / size))) : 1;
            const selected = size ? candidates.slice((page - 1) * size, page * size) : candidates;
            const rows = new Array<T>(selected.length);
            if (!rows.length) { resolve({ rows, total, page, pageSize: size }); return; }
            let pending = rows.length;
            selected.forEach((entry, position) => {
                const read = store.get(entry.id);
                read.onerror = () => reject(read.error);
                read.onsuccess = () => { rows[position] = read.result; if (!--pending) resolve({ rows, total, page, pageSize: size }); };
            });
        };
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const key = cursor.key as [number, string, string, string, string, number, string, number?, number?];
                if (!needle || `${key[1]} ${key[2]}`.includes(needle)) candidates.push({ id: cursor.primaryKey, name: key[1], value: 0, originalPrice: key[7], sellable: key[8] });
                cursor.continue(); return;
            }
            if (!candidates.length) { finish(); return; }
            let pending = candidates.length;
            const done = () => { if (!--pending) finish(); };
            for (const entry of candidates) {
                if (options.sort.startsWith('stock-')) {
                    const count = store.transaction.objectStore('STOCK').get(entry.id);
                    count.onerror = () => reject(count.error);
                    count.onsuccess = () => { entry.value = count.result?.count ?? 0; done(); };
                } else {
                    const price = (original: number, canSell: number) => {
                        if (canSell === 0) { entry.value = null; done(); return; }
                        const latest = store.transaction.objectStore('ITEM_PRICE_CHANGES').index('itemTimestamp').openCursor(IDBKeyRange.bound([entry.id, 0], [entry.id, Number.MAX_SAFE_INTEGER]), 'prev');
                        latest.onerror = () => reject(latest.error);
                        latest.onsuccess = () => { entry.value = latest.result?.value.amount ?? original; done(); };
                    };
                    if (entry.originalPrice !== undefined && entry.sellable !== undefined) price(entry.originalPrice, entry.sellable);
                    else {
                        // Earlier catalog keys lack base-price metadata; read that legacy schema only.
                        const product = store.get(entry.id);
                        product.onerror = () => reject(product.error);
                        product.onsuccess = () => price(product.result.amount, product.result.canSell ?? 1);
                    }
                }
            }
        };
    });
}
