const pendingReads = new WeakMap<IDBDatabase, Map<string, Promise<unknown>>>();

/** Share identical in-flight reads (including React development remounts), never cache results. */
export default function coalesceRead<T>(database: IDBDatabase, key: string, read: () => Promise<T>): Promise<T> {
    let pending = pendingReads.get(database);
    if (!pending) { pending = new Map(); pendingReads.set(database, pending); }
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const request = read();
    pending.set(key, request);
    const clear = () => { if (pending!.get(key) === request) pending!.delete(key); };
    void request.then(clear, clear);
    return request;
}
