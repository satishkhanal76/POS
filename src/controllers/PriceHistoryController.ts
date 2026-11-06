import { getLocaleText } from "../contexts/Locale";
import ProductOS from "../database/ProductOS";
import ItemPriceChangesOS from "../database/ItemPriceChangesOS";

export interface PriceHistoryEntry {
  id: string;
  deletedAt?: number;
  itemId: string;
  itemName: string;
  previousAmount: number;
  amount: number;
  timestamp: number;
}

/** Joins price events with catalog names and derives the preceding price. */
export default class PriceHistoryController {
  constructor(
    private readonly products: ProductOS,
    private readonly changes: ItemPriceChangesOS,
  ) {}

  public async getHistory(
    includeDeleted = false,
  ): Promise<PriceHistoryEntry[]> {
    const [products, changes] = await Promise.all([
      this.products.getAll(undefined, includeDeleted),
      this.changes.getAll(),
    ]);
    const names = new Map(
      products.map((product) => [product.getId(), product.getName()]),
    );
    const prices = new Map(
      products.map((product) => [product.getId(), product.getOriginalAmount()]),
    );
    const oldestFirst = changes
      .map((change) => change.data)
      .filter((change) => names.has(change.itemId))
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    const history = oldestFirst.map((change) => {
      const entry: PriceHistoryEntry = {
        ...change,
        deletedAt: products.find((product) => product.getId() === change.itemId)
          ?.deletedAt,
        itemName:
          names.get(change.itemId) || getLocaleText("UI_UNAVAILABLE_ITEM"),
        previousAmount: prices.get(change.itemId) ?? change.amount,
      };
      prices.set(change.itemId, change.amount);
      return entry;
    });
    return history.reverse();
  }
}
