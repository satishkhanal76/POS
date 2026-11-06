import { ItemPriceChangeSchema } from "../../models/ItemPriceChange";
import { indexedHeader, LISTING_VERSION } from "./metadata";

export function indexedPriceChange<T extends ItemPriceChangeSchema>(
  row: T,
  productDeletedAt?: number,
) {
  return {
    ...row,
    listVersion: LISTING_VERSION,
    listDate: indexedHeader({ ...row, deletedAt: productDeletedAt }, "price", [
      row.itemId,
    ]).listDate,
  };
}
