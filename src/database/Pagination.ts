export interface PageOptions {
  page: number;
  pageSize: number;
  sort: 'newest' | 'oldest';
}
export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Skip index entries without loading their records, then read only this page. */
export function readIndexPage<T>(index: IDBIndex, options: PageOptions, range?: IDBKeyRange): Promise<PageResult<T>> {
  const requestedSize = [0, 10, 25, 50, 100].includes(options.pageSize) ? options.pageSize : 10;
  return new Promise((resolve, reject) => {
    const count = index.count(range);
    count.onerror = () => reject(count.error);
    count.onsuccess = () => {
      const pageSize = requestedSize === 0 ? Math.max(1, count.result) : requestedSize;
      const page = Math.max(1, Math.min(Math.floor(options.page) || 1, Math.max(1, Math.ceil(count.result / pageSize))));
      const result: PageResult<T> = { rows: [], total: count.result, page, pageSize: requestedSize };
      const cursor = index.openCursor(range, options.sort === 'oldest' ? 'next' : 'prev');
      let skipped = false;
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) { resolve(result); return; }
        const offset = (page - 1) * pageSize;
        if (!skipped && offset) { skipped = true; entry.advance(offset); return; }
        result.rows.push(entry.value as T);
        if (result.rows.length === pageSize) resolve(result);
        else entry.continue();
      };
    };
  });
}

export function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
