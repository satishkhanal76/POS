export interface TransactionContact {
  id: string;
  name: string;
  deletedAt?: number;
}

/** Lightweight history projection; full domain objects load only on the detail page. */
export interface TransactionListEntry {
  id: string;
  deletedAt?: number;
  timestamp: number;
  total: number;
  kind?: "sale" | "payment";
  itemCount: number;
  contacts?: TransactionContact[];
}
