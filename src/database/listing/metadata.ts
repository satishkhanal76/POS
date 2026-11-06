export const LISTING_VERSION = 14;
export const kindScope = (kind: string) => JSON.stringify(["kind", kind]);
export const contactScope = (id: string, kind?: string) =>
  JSON.stringify(["contact", id, kind ?? null]);
export const invoiceScope = (id: string, reference: string) =>
  JSON.stringify(["invoice", id, reference.trim()]);
export const listingIndexes = ["listDate", "listAmount", "listItems"] as const;
type Header = {
  id: string;
  timestamp: number;
  total?: number;
  amount?: number;
  deletedAt?: number;
  kind?: string;
  contactId?: string;
  listItemCount?: number;
  listCustomerIds?: string[];
};

/** Derived query keys are rebuilt from canonical records during upgrades and restore. */
export function indexedHeader<T extends Header>(
  row: T,
  kind = row.kind ?? "sale",
  customers = row.listCustomerIds ?? [],
  itemCount = row.listItemCount,
) {
  const scopes = ["all", kindScope(kind)];
  const contacts = row.contactId ? [row.contactId] : customers;
  for (const id of contacts)
    scopes.push(contactScope(id), contactScope(id, kind));
  if (kind === "supplier-payment" && row.contactId && "reference" in row)
    scopes.push(invoiceScope(row.contactId, String(row.reference)));
  const visible = row.deletedAt ? [1] : [0, 1];
  const count = itemCount ?? 0;
  const complete = kind !== "sale" || itemCount !== undefined;
  const keys = (value: number) =>
    scopes.flatMap((scope) =>
      visible.map((state) => [
        scope,
        state,
        value,
        row.timestamp,
        row.id,
        row.total ?? row.amount ?? 0,
        count,
      ]),
    );
  return {
    ...row,
    listVersion: complete ? LISTING_VERSION : undefined,
    listCustomerIds: customers,
    listItemCount: complete ? count : undefined,
    listDate: keys(row.timestamp),
    listAmount: keys(Math.abs(row.total ?? row.amount ?? 0)),
    listItems: keys(count),
  };
}

export function createListingIndexes(store: IDBObjectStore) {
  for (const name of listingIndexes)
    if (!store.indexNames.contains(name))
      store.createIndex(name, name, { multiEntry: true });
}

/** Internal indexes are portable derived data, not part of the backup contract. */
export function withoutListing<T extends object>(row: T): T {
  const result = { ...row } as Record<string, unknown>;
  for (const key of [
    "listVersion",
    "listDate",
    "listAmount",
    "listItems",
    "listItemCount",
    "listCustomerIds",
    "catalogKeys",
    "activeLink",
  ])
    delete result[key];
  return result as T;
}

export function indexedSummary<
  T extends { id: string; timestamp: number; total: number; count: number },
>(row: T, deletedAt?: number) {
  return indexedHeader({ ...row, deletedAt }, "summary", [], row.count);
}

export function indexedLink<
  T extends {
    id: string;
    customerId: string;
    transactionId: string;
    timestamp: number;
    deletedAt?: number;
  },
>(row: T) {
  return {
    ...row,
    listVersion: LISTING_VERSION,
    activeLink: row.deletedAt
      ? undefined
      : [row.customerId, row.timestamp, row.transactionId, row.id],
  };
}
