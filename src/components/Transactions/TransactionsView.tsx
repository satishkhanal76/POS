import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale, useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import TransactionController from '../../controllers/TransactionController';
import CustomersTransactionsController from '../../controllers/CustomersTransactionsController';
import { TransactionListEntry } from '../../models/TransactionListEntry';
import { PageOptions } from '../../database/Pagination';
import usePagedQuery from '../../hooks/usePagedQuery';
import Price from '../Items/Price';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import PaginationControls from '../utils/PaginationControls';

export default function TransactionsView({ customerId }: { customerId?: string }) {
  const t = useLocaleText();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionsOS, cutomersTransactionsOS } = useDatabase();
  const controller = useMemo(() => new TransactionController(transactionsOS), [transactionsOS]);
  const customerController = useMemo(() => new CustomersTransactionsController(cutomersTransactionsOS), [cutomersTransactionsOS]);
  const query = useCallback((options: PageOptions) => customerId
    ? customerController.getPage(customerId, options)
    : controller.getPage(options), [customerId, customerController, controller]);
  const pagination = usePagedQuery(query);
  const columns: CustomTableColumn<TransactionListEntry>[] = [
    { key: 'time', header: text.TRANSACTION_TABLE_HEADER_TIME, render: row => new Date(row.timestamp).toLocaleString() },
    { key: 'kind', header: t('PAYMENT_TYPE'), render: row => t(row.kind === 'payment' ? 'PAYMENT_TITLE' : 'PAYMENT_SALE') },
    { key: 'items', header: text.TRANSACTION_TABLE_HEADER_NUM_OF_ITEMS, variant: 'numeric', render: row => row.itemCount },
    { key: 'total', header: text.TRANSACTION_TABLE_HEADER_TOTAL, variant: 'numeric', render: row => <Price price={row.total} /> },
  ];
  return <>
    <PaginationControls page={pagination.page} pageSize={pagination.pageSize} sort={pagination.sort} total={pagination.result?.total ?? 0} busy={pagination.loading} onChange={pagination.change} />
    {pagination.error ? <p role="alert">{t('PAGINATION_ERROR')}</p> : pagination.loading ? <p role="status">{t('PAGINATION_LOADING')}</p> :
      <CustomTableView label={t('TRANSACTIONS_TITLE')} emptyTitle={t('UI_NO_TRANSACTIONS_YET')} emptyDescription={t('UI_POSTED_SALES_WILL_APPEAR_HERE_CREATE_A_SALE_FROM')}
        data={pagination.result?.rows ?? []} columns={columns} rowKey={row => row.id}
        onRowClick={row => navigate(`/transaction?id=${encodeURIComponent(row.id)}`, { state: { returnTo: location.pathname + location.search, returnState: location.state } })} />}
  </>;
}
