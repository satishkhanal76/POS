import { LISTING_VERSION } from "./metadata";
import coalesceRead from "./coalesceRead";
import { PageOptions, PageResult } from "../Pagination";

type CatalogRow = {
  id: string;
  name: string;
  phoneNumber?: string;
  deletedAt?: number;
};
export function indexedCatalog<T extends CatalogRow>(row: T) {
  const keys = (row.deletedAt ? [1] : [0, 1]).map((state) => [
    state,
    row.name.toLocaleLowerCase(),
    (row.phoneNumber ?? "").toLocaleLowerCase(),
    row.id,
    row.name,
    row.deletedAt ?? 0,
    row.phoneNumber ?? "",
  ]);
  return { ...row, listVersion: LISTING_VERSION, catalogKeys: keys };
}
export function createCatalogIndex(store: IDBObjectStore) {
  if (!store.indexNames.contains("catalogKeys"))
    store.createIndex("catalogKeys", "catalogKeys", { multiEntry: true });
}
/** Substring searches inspect normalized index keys; only this page's values are read. */
export default function readCatalogPage<T>(
  store: IDBObjectStore,
  options: PageOptions,
  search = "",
): Promise<PageResult<T>> {
    const key = JSON.stringify(['catalog', store.name, options, search.trim().toLocaleLowerCase()]);
    return coalesceRead(store.transaction.db, key, () => executeCatalogPage<T>(store, options, search));
}

function executeCatalogPage<T>(store: IDBObjectStore, options: PageOptions, search: string): Promise<PageResult<T>> {
  return new Promise((resolve, reject) => {
    const size = [0, 10, 25, 50, 100].includes(options.pageSize)
      ? options.pageSize
      : 10;
    const requested = size ? Math.max(1, Math.floor(options.page) || 1) : 1;
    const needle = search.trim().toLocaleLowerCase(),
      state = options.includeDeleted ? 1 : 0;
    const index = store.index("catalogKeys"),
      bound = IDBKeyRange.bound([state], [state, []]);
    const load = (ids: IDBValidKey[], total: number, page: number) => {
      const rows = new Array<T>(ids.length);
      if (!ids.length) {
        resolve({ rows, total, page, pageSize: size });
        return;
      }
      let pending = ids.length;
      ids.forEach((id, position) => {
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          rows[position] = request.result;
          if (!--pending) resolve({ rows, total, page, pageSize: size });
        };
      });
    };
    if (!needle) {
      const count = index.count(bound);
      count.onerror = () => reject(count.error);
      count.onsuccess = () => {
        const total = count.result,
          page = size
            ? Math.min(requested, Math.max(1, Math.ceil(total / size)))
            : 1;
        const ids: IDBValidKey[] = [];
        const request = index.openKeyCursor(bound);
        let skipped = false;
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            load(ids, total, page);
            return;
          }
          if (!skipped && size && page > 1) {
            skipped = true;
            cursor.advance((page - 1) * size);
            return;
          }
          ids.push(cursor.primaryKey);
          if (size && ids.length === size) load(ids, total, page);
          else cursor.continue();
        };
      };
    } else {
      const ids: IDBValidKey[] = [],
        tail: IDBValidKey[] = [];
      let total = 0;
      const request = index.openKeyCursor(bound);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          const page = size
            ? Math.min(requested, Math.max(1, Math.ceil(total / size)))
            : 1;
          load(page === requested ? ids : tail, total, page);
          return;
        }
        const key = cursor.key as [number, string, string, string];
        if (`${key[1]} ${key[2]}`.includes(needle)) {
          if (size && total % size === 0) tail.length = 0;
          tail.push(cursor.primaryKey);
          if (!size || Math.floor(total / size) + 1 === requested)
            ids.push(cursor.primaryKey);
          total++;
        }
        cursor.continue();
      };
    }
  });
}
