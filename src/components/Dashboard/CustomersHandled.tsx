import { useLocation, useNavigate } from "react-router-dom";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardSummary } from "../../controllers/DashboardController";
import { CustomTableColumn } from "../utils/CustomTableView";
import Price from "../Items/Price";
import ReportTable from "./ReportTable";

type Row = DashboardSummary["handledCustomers"][number];
export default function CustomersHandled({
  rows,
  periodParams,
}: {
  rows: Row[];
  periodParams: URLSearchParams;
}) {
  const t = useLocaleText();
  const navigate = useNavigate();
  const location = useLocation();
  const columns: CustomTableColumn<Row>[] = [
    { key: "name", header: t("CUSTOMER_NAME"), render: (row) => row.name },
    {
      key: "count",
      header: t("DASH_SALE_COUNT"),
      variant: "numeric",
      render: (row) => row.salesCount,
    },
    {
      key: "sales",
      header: t("DASH_SALES"),
      variant: "numeric",
      render: (row) => <Price price={row.sales} />,
    },
    {
      key: "paymentCount",
      header: t("DASH_PAYMENT_COUNT"),
      variant: "numeric",
      render: (row) => row.paymentCount,
    },
    {
      key: "payments",
      header: t("DASH_PAYMENTS"),
      variant: "numeric",
      render: (row) => <Price price={row.payments} />,
    },
  ];
  return (
    <ReportTable
      rows={rows}
      columns={columns}
      label={t("DASH_CUSTOMERS")}
      rowKey={(row) => row.id}
      onRowClick={(row) => {
        const params = new URLSearchParams(periodParams);
        params.set("id", row.id);
        navigate(`/contact?${params}#transactions`, {
          state: { returnTo: location.pathname + location.search },
        });
      }}
    />
  );
}
