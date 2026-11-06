import { v4 as uuid } from "uuid";

/** Human-facing invoice numbers stay separate from permanent relationship IDs. */
export function createPurchaseInvoice(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PUR-${date}-${uuid().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Older purchases may have been saved without a reference. */
export function purchaseInvoice(purchase: {
  reference: string;
  id: string;
}): string {
  return (
    purchase.reference.trim() || `PUR-${purchase.id.slice(0, 8).toUpperCase()}`
  );
}

/** Preserve existing distinct invoices and fill legacy blanks/duplicates in place. */
export function normalizePurchaseInvoices<T extends { reference: string }>(
  rows: T[],
): T[] {
  const clean = (row: T) =>
    typeof row.reference === "string" ? row.reference.trim() : "";
  const reserved = new Set(rows.map(clean).filter(Boolean));
  const seen = new Set<string>();
  return rows.map((row) => {
    let reference = clean(row);
    if (!reference || seen.has(reference)) {
      do {
        reference = createPurchaseInvoice();
      } while (reserved.has(reference));
      reserved.add(reference);
    }
    seen.add(reference);
    return { ...row, reference };
  });
}
