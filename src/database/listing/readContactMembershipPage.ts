import { DashboardRange } from "../../dashboard/period";
import { PageOptions, PageResult } from "../Pagination";
import { TransactionsSchema } from "../TransactionsOS";
import { kindScope } from "./metadata";

/** Filter using existing contact projection keys, without a schema change or loading headers. */
export default function readContactMembershipPage(
  database: IDBDatabase,
  options: PageOptions,
  range: DashboardRange,
  linked: boolean,
  kind?: string,
): Promise<PageResult<TransactionsSchema>> {
  return new Promise((resolve, reject) => {
    const store = database
      .transaction("TRANSACTIONS")
      .objectStore("TRANSACTIONS");
    const index = store.index("listDate");
    const state = options.includeDeleted ? 1 : 0;
    const members = new Set<IDBValidKey>();
    const contacts = index.openKeyCursor(
      IDBKeyRange.bound(['["contact",'], ['["contact",\uffff']),
    );
    contacts.onerror = () => reject(contacts.error);
    contacts.onsuccess = () => {
      const cursor = contacts.result;
      if (cursor) {
        const [scope, visibility, timestamp] = cursor.key as [
          string,
          number,
          number,
        ];
        if (
          scope.endsWith(",null]") &&
          visibility === state &&
          (range.all || (timestamp >= range.start && timestamp < range.end))
        )
          members.add(cursor.primaryKey);
        cursor.continue();
        return;
      }
      selectPage();
    };
    const selectPage = () => {
      const size = [0, 10, 25, 50, 100].includes(options.pageSize)
        ? options.pageSize
        : 10;
      const requested = size ? Math.max(1, Math.floor(options.page) || 1) : 1;
      const limit = size ? requested * size : Infinity;
      const candidates: { id: IDBValidKey; key: IDBValidKey[] }[] = [];
      const descending =
        options.sort !== "oldest" && !options.sort.endsWith("-low");
      const compare = (
        a: (typeof candidates)[number],
        b: (typeof candidates)[number],
      ) => (descending ? -1 : 1) * indexedDB.cmp(a.key, b.key);
      const scope = kind ? kindScope(kind) : "all";
      const bound = range.all
        ? IDBKeyRange.bound([scope, state], [scope, state, []])
        : IDBKeyRange.bound(
            [scope, state, range.start],
            [scope, state, range.end],
            false,
            true,
          );
      let total = 0;
      const request = index.openKeyCursor(bound);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (members.has(cursor.primaryKey) === linked) {
            total++;
            const key = cursor.key as [
              string,
              number,
              number,
              number,
              string,
              number,
              number,
            ];
            const value = options.sort.startsWith("total-")
              ? Math.abs(key[5])
              : options.sort.startsWith("items-")
                ? key[6]
                : key[3];
            const entry = {
              id: cursor.primaryKey,
              key: [value, key[3], key[4]],
            };
            if (!size) {
              candidates.push(entry);
              cursor.continue();
              return;
            }
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
          return;
        }
        if (!size) candidates.sort(compare);
        const page = size
          ? Math.min(requested, Math.max(1, Math.ceil(total / size)))
          : 1;
        const visible = candidates.slice(
          size ? (page - 1) * size : 0,
          size ? page * size : undefined,
        );
        const rows: TransactionsSchema[] = new Array(visible.length);
        if (!visible.length) {
          resolve({ rows, total, page, pageSize: size });
          return;
        }
        let pending = visible.length;
        // Schedule reads in the cursor callback while the native transaction is active.
        visible.forEach((entry, position) => {
          const read = store.get(entry.id);
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            rows[position] = read.result;
            if (!--pending) resolve({ rows, total, page, pageSize: size });
          };
        });
      };
    };
  });
}
