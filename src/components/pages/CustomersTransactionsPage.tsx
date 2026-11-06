import PageHeader from "../Layout/PageHeader";
import CustomersTransactionsView from "../Customer/CustomersTransactionsView";
import { useLocale } from "../../contexts/Locale";

export default function CustomersTransactionsPage() {
  const text = useLocale();
  return (
    <main className="customer-transactions-page">
      <PageHeader title={text.CUSTOMERS_TRANSACTIONS_TITLE} />
      <CustomersTransactionsView />
    </main>
  );
}
