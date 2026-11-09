import { Translate } from "../../contexts/Locale";
import { IProductItem } from "../../models/ProductItem";
import { CustomTableColumn } from "../utils/CustomTableView";
import Price from "./Price";

/** Shared visible inventory columns for the table and its current-page report. */
export default function itemColumns(
  t: Translate,
  stock: boolean,
  counts?: Record<string, number> | null,
  error = false,
  sales = true,
): CustomTableColumn<IProductItem>[] {
  const columns: CustomTableColumn<IProductItem>[] = [
    {
      key: "name",
      header: t("ITEMS_TABLE_HEADER_NAME"),
      render: (item) => item.getName(),
    },
    ...(sales
      ? [
          {
            key: "price",
            header: t("ITEMS_TABLE_HEADER_PRICE"),
            variant: "numeric" as const,
            render: (item: IProductItem) =>
              item.canSell === 0 ? (
                t("BUY_NO_SELL_PRICE")
              ) : (
                <Price price={item.getAmount()} />
              ),
          },
        ]
      : []),
  ];
  if (stock)
    columns.push({
      key: "stock",
      header: t("STOCK_IN_STOCK"),
      variant: "numeric",
      render: (item) =>
        error
          ? t("STOCK_UNAVAILABLE")
          : counts
            ? (counts[item.getId()] ?? 0)
            : "…",
    });
  return columns;
}
