import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale, useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import CustomersTransactionsController from '../../controllers/CustomersTransactionsController';
import CustomerTransactionSummary from '../../models/CustomerTransactionSummary';
import { PageOptions } from '../../database/Pagination';
import usePagedQuery from '../../hooks/usePagedQuery';
import Price from '../Items/Price';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import PaginationControls from '../utils/PaginationControls';

export default function CustomersTransactionsView() {
  const t = useLocaleText();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { cutomersTransactionsOS, customerSummariesOS } = useDatabase();
  const controller = useMemo(() => new CustomersTransactionsController(cutomersTransactionsOS, customerSummariesOS), [cutomersTransactionsOS, customerSummariesOS]);
  const query = useCallback((options: PageOptions) => controller.getSummaryPage(options), [controller]);
  const pagination = usePagedQuery(query);
  const columns: CustomTableColumn<CustomerTransactionSummary>[] = [
    { key: 'name', header: text.CUSTOMER_TABLE_HEADER_NAME, render: row => row.customer.getName() },
    { key: 'count', header: text.CUSTOMERS_TRANSACTIONS_NUM_OF_TRANS, variant: 'numeric', render: row => row.data.count },
    { key: 'total', header: text.CUSTOMERS_TRANSACTIONS_TOTAL, variant: 'numeric', render: row => <Price price={row.data.total} /> },
    { key: 'latest', header: t('PAGINATION_LATEST_SALE'), render: row => new Date(row.data.timestamp).toLocaleString() },
  ];
  return <>
    <PaginationControls page={pagination.page} pageSize={pagination.pageSize} sort={pagination.sort} total={pagination.result?.total ?? 0} busy={pagination.loading} onChange={pagination.change} />
    {pagination.error ? <p role="alert">{t('PAGINATION_ERROR')}</p> : pagination.loading ? <p role="status">{t('PAGINATION_LOADING')}</p> :
      <CustomTableView label={t('UI_CUSTOMER_TRANSACTIONS')} emptyTitle={t('UI_NO_CUSTOMER_SALES_YET')} emptyDescription={t('UI_SALES_SAVED_AGAINST_A_CUSTOMER_WILL_APPEAR_HERE')}
        data={pagination.result?.rows ?? []} columns={columns} rowKey={row => row.data.id}
        onRowClick={row => navigate(`/customer-transactions?id=${encodeURIComponent(row.data.id)}`, { state: { returnTo: location.pathname + location.search } })} />}
  </>;
}
