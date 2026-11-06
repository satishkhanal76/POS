/** Lightweight history projection; full domain objects load only on the detail page. */
export interface TransactionListEntry {
  id: string;
  timestamp: number;
  total: number;
  kind?: "sale" | "payment";
  itemCount: number;
}
