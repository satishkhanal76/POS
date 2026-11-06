import { PageOptions, PageResult } from '../Pagination';
import { TransactionsSchema } from '../TransactionsOS';
import { DashboardRange } from '../../dashboard/period';
import coalesceRead from './coalesceRead';

/** The ordinary latest/oldest page needs only the original timestamp index. */
export default function readDatePage(database: IDBDatabase, options: PageOptions, range: DashboardRange): Promise<PageResult<TransactionsSchema>> {
    return coalesceRead(database, JSON.stringify(['timestamp-page', options, range]), () => new Promise((resolve, reject) => {
        const store = database.transaction('TRANSACTIONS').objectStore('TRANSACTIONS');
        const dates = store.index('timestamp'), deleted = store.index('deletedTimestamp');
        const bound = range.all ? undefined : IDBKeyRange.bound(range.start, range.end, false, true);
        const removedBound = range.all ? undefined : IDBKeyRange.bound([range.start], [range.end], false, true);
        const size = [0, 10, 25, 50, 100].includes(options.pageSize) ? options.pageSize : 10;
        let remaining = options.includeDeleted ? 1 : 2, total = 0, removed = 0;
        const counted = () => {
            if (--remaining) return;
            total -= removed;
            const page = size ? Math.min(Math.max(1, Math.floor(options.page) || 1), Math.max(1, Math.ceil(total / size))) : 1;
            const result: PageResult<TransactionsSchema> = { rows: [], total, page, pageSize: size };
            if (!total) { resolve(result); return; }
            const offset = size ? (page - 1) * size : 0;
            let skipped = 0, advanced = false;
            const request = dates.openKeyCursor(bound, options.sort === 'oldest' ? 'next' : 'prev');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) { resolve(result); return; }
                if (!removed && offset && !advanced) { advanced = true; skipped = offset; cursor.advance(offset); return; }
                const accept = () => {
                    if (skipped < offset) { skipped++; cursor.continue(); return; }
                    const header = store.get(cursor.primaryKey);
                    header.onerror = () => reject(header.error);
                    header.onsuccess = () => {
                        result.rows.push(header.result);
                        if (size && result.rows.length === size) resolve(result); else cursor.continue();
                    };
                };
                if (!removed) { accept(); return; }
                const check = deleted.count(IDBKeyRange.bound([cursor.key], [cursor.key, []]));
                check.onerror = () => reject(check.error);
                check.onsuccess = () => check.result ? cursor.continue() : accept();
            };
        };
        const count = dates.count(bound);
        count.onerror = () => reject(count.error);
        count.onsuccess = () => { total = count.result; counted(); };
        if (!options.includeDeleted) {
            const countRemoved = deleted.count(removedBound);
            countRemoved.onerror = () => reject(countRemoved.error);
            countRemoved.onsuccess = () => { removed = countRemoved.result; counted(); };
        }
    }));
}
