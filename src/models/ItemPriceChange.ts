export interface ItemPriceChangeSchema {
  id: string;
  itemId: string;
  amount: number;
  timestamp: number;
}

export default class ItemPriceChange {
  constructor(public readonly data: ItemPriceChangeSchema) {}
}
