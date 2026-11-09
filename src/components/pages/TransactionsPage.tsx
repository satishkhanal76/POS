import { useClientGlobal } from "../../contexts/ClientGlobal";
import PageHeader from "../Layout/PageHeader";
import TransactionsView from "../Transactions/TransactionsView";
import { useLocale } from "../../contexts/Locale";

const TransactionsPage = () => {
  const text = useLocale();

  const settings = useClientGlobal();
  return (
    <>
      <PageHeader title={text.TRANSACTIONS_TITLE} />
      <TransactionsView
        contactFilter
        defaultPeriod={settings.historyPeriod}
        defaultSort={settings.salesSort}
        defaultFilter={settings.salesFilter}
        defaultPageSize={Number(settings.historyPageSize)}
      />
    </>
  );
};

export default TransactionsPage;
