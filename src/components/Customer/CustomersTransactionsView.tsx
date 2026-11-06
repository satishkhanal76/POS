import DeletedVisibility from '../utils/DeletedVisibility';
import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import useDeletionRevision from '../../hooks/useDeletionRevision';
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
  const { includeDeleted } = useDeletedVisibility();
  const revision = useDeletionRevision();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { cutomersTransactionsOS, customerSummariesOS } = useDatabase();
  const controller = useMemo(() => new CustomersTransactionsController(cutomersTransactionsOS, customerSummariesOS), [cutomersTransactionsOS, customerSummariesOS]);
  const query = useCallback((options: PageOptions) => { void revision; return controller.getSummaryPage({ ...options, includeDeleted }); }, [controller, includeDeleted, revision]);
  const pagination = usePagedQuery(query);
  const columns: CustomTableColumn<CustomerTransactionSummary>[] = [
    { key: 'name', header: text.CUSTOMER_TABLE_HEADER_NAME, render: row => row.customer.getName() },
    { key: 'count', header: text.CUSTOMERS_TRANSACTIONS_NUM_OF_TRANS, variant: 'numeric', render: row => row.data.count },
    { key: 'total', header: t('PAYMENT_BALANCE'), variant: 'numeric', render: row => <Price price={row.data.total} /> },
    { key: 'latest', header: t('PAYMENT_ACTIVITY'), render: row => new Date(row.data.timestamp).toLocaleString() },
  ];
  return <>
    <DeletedVisibility />
    <PaginationControls page={pagination.page} pageSize={pagination.pageSize} sort={pagination.sort} total={pagination.result?.total ?? 0} busy={pagination.loading} onChange={pagination.change} />
    {pagination.error ? <p role="alert">{t('PAGINATION_ERROR')}</p> : pagination.loading ? <p role="status">{t('PAGINATION_LOADING')}</p> :
      <CustomTableView label={t('UI_CUSTOMER_TRANSACTIONS')} emptyTitle={t('UI_NO_CUSTOMER_SALES_YET')} emptyDescription={t('UI_SALES_SAVED_AGAINST_A_CUSTOMER_WILL_APPEAR_HERE')}
        data={pagination.result?.rows ?? []} columns={columns} rowKey={row => row.data.id}
        onRowClick={row => navigate(`/customer-transactions?id=${encodeURIComponent(row.data.id)}${includeDeleted ? '&deleted=1' : ''}`, { state: { returnTo: location.pathname + location.search } })} />}
  </>;
}
