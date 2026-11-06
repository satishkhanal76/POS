import ReportTable from "./ReportTable";
import { LocaleKey } from "../../contexts/Locale";
import Select from "../Forms/Select";
import CollapsibleReport from "../utils/CollapsibleReport";
import { useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardSummary } from "../../controllers/DashboardController";
import { CustomTableColumn } from "../utils/CustomTableView";
import Price from "../Items/Price";
type Item = DashboardSummary["topItems"][number];
export default function TopSellingItems({
  items,
  title = "DASH_TOP_ITEMS",
}: {
  items: Item[];
  title?: LocaleKey;
}) {
  const t = useLocaleText();
  const [sort, setSort] = useState<"quantity" | "gross">("quantity");
  const rows = [...items].sort(
    (a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name),
  );
  const columns: CustomTableColumn<Item>[] = [
    { key: "name", header: t("DASH_ITEM"), render: (row) => row.name },
    {
      key: "quantity",
      header: t("DASH_UNITS"),
      variant: "numeric",
      render: (row) => row.quantity,
    },
    {
      key: "sales",
      header: t("DASH_SALE_COUNT"),
      variant: "numeric",
      render: (row) => row.salesCount,
    },
    {
      key: "gross",
      header: t("DASH_ITEM_VALUE"),
      variant: "numeric",
      render: (row) => <Price price={row.gross} />,
    },
  ];
  return (
    <CollapsibleReport title={t(title)}>
      <p className="dashboard-note">{t("DASH_TOP_ITEMS_HELP")}</p>
      <div className="dashboard-filters">
        <label>
          {t("DASH_RANK_BY")}
          <Select
            value={sort}
            onChange={(value) => setSort(value as "quantity" | "gross")}
          >
            <option value="quantity">{t("DASH_UNITS")}</option>
            <option value="gross">{t("DASH_ITEM_VALUE")}</option>
          </Select>
        </label>
      </div>
      <ReportTable
        label={t(title)}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
      />
    </CollapsibleReport>
  );
}
