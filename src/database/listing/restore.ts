import { indexedCatalog } from "./catalog";
import { indexedHeader, indexedSummary, indexedLink } from "./metadata";
import { indexedPriceChange } from "./priceHistory";
import type { BackupRow } from "../DatabaseBackup";

/** Keep only compact lookup maps; derive keys for each bounded restore batch. */
export function prepareListingRestore(tables: Record<string, BackupRow[]>) {
  const itemCounts = new Map<string, number>(),
    contacts = new Map<string, string[]>();
  for (const name of ["TRANSACTION_PRODUCTS", "TRANSACTION_DISCOUNTS"])
    for (const row of tables[name]) {
      const id = String(row.transactionId);
      itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
    }
  for (const row of tables.CUSTOMERS_TRANSACTIONS)
    if (!row.deletedAt) {
      const id = String(row.transactionId);
      contacts.set(id, [...(contacts.get(id) ?? []), String(row.customerId)]);
    }
  const customers = new Map(
    tables.CUSTOMER.map((row) => [String(row.id), row]),
  );
  const products = new Map(tables.PRODUCTS.map((row) => [String(row.id), row]));
  return (name: string, row: BackupRow): object => {
    switch (name) {
      case "TRANSACTIONS":
        return indexedHeader(
          row as unknown as { id: string; timestamp: number },
          String(row.kind ?? "sale"),
          contacts.get(String(row.id)) ?? [],
          itemCounts.get(String(row.id)) ?? 0,
        );
      case "PURCHASES":
        return indexedHeader(
          row as unknown as { id: string; timestamp: number },
          "purchase",
        );
      case "SUPPLIER_PAYMENTS":
        return indexedHeader(
          row as unknown as { id: string; timestamp: number },
          "supplier-payment",
        );
      case "CUSTOMERS_TRANSACTIONS":
        return indexedLink(
          row as unknown as {
            id: string;
            customerId: string;
            transactionId: string;
            timestamp: number;
          },
        );
      case "PRODUCTS":
      case "CUSTOMER":
        return indexedCatalog(row as unknown as { id: string; name: string });
      case "CUSTOMER_TRANSACTION_SUMMARIES":
        return indexedSummary(
          row as unknown as {
            id: string;
            timestamp: number;
            count: number;
            total: number;
          },
          customers.get(String(row.id))?.deletedAt as number | undefined,
        );
      case "ITEM_PRICE_CHANGES":
        return indexedPriceChange(
          row as unknown as {
            id: string;
            itemId: string;
            timestamp: number;
            amount: number;
          },
          products.get(String(row.itemId))?.deletedAt as number | undefined,
        );
      default:
        return row;
    }
  };
}
