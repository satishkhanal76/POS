import coalesceRead from "./coalesceRead";
import { DashboardRange } from "../../dashboard/period";
import { PageOptions, PageResult } from "../Pagination";

type Key = [string, number, number, number, string, number, number];
interface Candidate {
  key: Key;
  store: IDBObjectStore;
  id: IDBValidKey;
}

/** Merge small key-only pages. Record values are read only after the global page is selected. */
export default function readListingPage<T>(
  stores: IDBObjectStore[],
  options: PageOptions,
  range: DashboardRange,
  scope = "all",
): Promise<PageResult<T>> {
    const key = JSON.stringify(['listing', stores.map(store => store.name), options, range, scope]);
    return coalesceRead(stores[0].transaction.db, key, () => executeListingPage<T>(stores, options, range, scope));
}

function executeListingPage<T>(stores: IDBObjectStore[], options: PageOptions, range: DashboardRange, scope: string): Promise<PageResult<T>> {
  if (
    !range.all &&
    (options.sort.startsWith("total-") || options.sort.startsWith("items-"))
  )
    return readSortedRange(stores, options, range, scope);
  return new Promise((resolve, reject) => {
    const size = [0, 10, 25, 50, 100].includes(options.pageSize)
      ? options.pageSize
      : 10;
    const requestedPage = size ? Math.max(1, Math.floor(options.page) || 1) : 1;
    const direction =
      options.sort === "oldest" || options.sort.endsWith("-low")
        ? "next"
        : "prev";
    const name = options.sort.startsWith("total-")
      ? "listAmount"
      : options.sort.startsWith("items-")
        ? "listItems"
        : "listDate";
    const state = options.includeDeleted ? 1 : 0;
    const bound =
      name === "listDate" && !range.all
        ? IDBKeyRange.bound(
            [scope, state, range.start],
            [scope, state, range.end],
            false,
            true,
          )
        : IDBKeyRange.bound([scope, state], [scope, state, []]);
    let pending = stores.length,
      total = 0;
    const countFinished = () => {
      if (--pending) return;
      const page = size
        ? Math.min(requestedPage, Math.max(1, Math.ceil(total / size)))
        : 1;
      const offset = size ? (page - 1) * size : 0;
      const limit = size ? offset + size : Infinity;
      const fastSkip = stores.length === 1;
      const candidates: Candidate[] = [];
      pending = stores.length;
      const selected = () => {
        if (--pending) return;
        candidates.sort((a, b) => {
          const order = indexedDB.cmp(a.key, b.key);
          return direction === "next" ? order : -order;
        });
        const start = fastSkip ? 0 : offset;
        const visible = candidates.slice(
          start,
          size ? start + size : undefined,
        );
        if (!visible.length) {
          resolve({ rows: [], total, page, pageSize: size });
          return;
        }
        const rows = new Array<T>(visible.length);
        let reads = visible.length;
        visible.forEach((entry, position) => {
          const request = entry.store.get(entry.id);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            rows[position] = request.result;
            if (!--reads) resolve({ rows, total, page, pageSize: size });
          };
        });
      };
      for (const store of stores) {
        // With one index and no residual date filter, jump over prior pages using keys.
        let read = 0,
          skipped = false;
        const cursor = store.index(name).openKeyCursor(bound, direction);
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) {
            selected();
            return;
          }
          const key = entry.key as Key;
          // Keep only the first limit keys per source; never materialize skipped records.
          if (fastSkip && offset && !skipped) {
            skipped = true;
            entry.advance(offset);
            return;
          }
          candidates.push({ key, store, id: entry.primaryKey });
          if (++read >= (stores.length === 1 && skipped ? size : limit))
            selected();
          else entry.continue();
        };
      }
    };
    for (const store of stores) {
      const request = store.index(name).count(bound);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        total += request.result;
        countFinished();
      };
    }
  });
}

/** Prefer the date index for ranged rankings, then sort compact keys, not records. */
function readSortedRange<T>(
  stores: IDBObjectStore[],
  options: PageOptions,
  range: DashboardRange,
  scope: string,
): Promise<PageResult<T>> {
  return new Promise((resolve, reject) => {
    const size = [0, 10, 25, 50, 100].includes(options.pageSize)
      ? options.pageSize
      : 10;
    const requested = size ? Math.max(1, Math.floor(options.page) || 1) : 1;
    const limit = size ? requested * size : Infinity;
    const state = options.includeDeleted ? 1 : 0;
    const bound = IDBKeyRange.bound(
      [scope, state, range.start],
      [scope, state, range.end],
      false,
      true,
    );
    const high = options.sort.endsWith("-high");
    const compare = (a: Candidate, b: Candidate) =>
      (high ? -1 : 1) * indexedDB.cmp(a.key, b.key);
    const candidates: Candidate[] = [];
    let pending = stores.length,
      total = 0;
    const finish = () => {
      if (--pending) return;
      if (!size) candidates.sort(compare);
      const page = size
        ? Math.min(requested, Math.max(1, Math.ceil(total / size)))
        : 1;
      const visible = candidates.slice(
        size ? (page - 1) * size : 0,
        size ? page * size : undefined,
      );
      const rows = new Array<T>(visible.length);
      if (!visible.length) {
        resolve({ rows, total, page, pageSize: size });
        return;
      }
      let reads = visible.length;
      visible.forEach((entry, position) => {
        const request = entry.store.get(entry.id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          rows[position] = request.result;
          if (!--reads) resolve({ rows, total, page, pageSize: size });
        };
      });
    };
    for (const store of stores) {
      const request = store.index("listDate").openKeyCursor(bound);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          finish();
          return;
        }
        total++;
        const key = [...(cursor.key as Key)] as Key;
        key[2] = options.sort.startsWith("items-") ? key[6] : Math.abs(key[5]);
        const entry = { key, store, id: cursor.primaryKey };
        if (!size) candidates.push(entry);
        else {
          let low = 0,
            high = candidates.length;
          while (low < high) {
            const middle = (low + high) >>> 1;
            if (compare(candidates[middle], entry) <= 0) low = middle + 1;
            else high = middle;
          }
          if (low < limit) {
            candidates.splice(low, 0, entry);
            if (candidates.length > limit) candidates.pop();
          }
        }
        cursor.continue();
      };
    }
  });
}
