import StockOS from "../database/StockOS";
import { loadSettings } from "../settings/settings";
import { getLocaleText } from "../localization/locale";

export default class StockController {
  constructor(private readonly store: StockOS) {}
  async checkQuantity(id: string, name: string, quantity: number) {
    const settings = loadSettings();
    if (!settings.stockManagement) return "";
    const counts = await this.store.getCounts([id]);
    if (quantity <= counts[id] + 1e-9) return "";
    const message = getLocaleText("STOCK_SHORTAGE", {
      item: name,
      available: counts[id],
      requested: quantity,
    });
    if (settings.forceStockAdherence) throw new Error(message);
    return message;
  }
  setCount(id: string, count: number) {
    return this.store.setCount(id, count);
  }
}
