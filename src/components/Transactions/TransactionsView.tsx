import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocale, useLocaleText } from '../../contexts/Locale';
import { useDatabase } from '../../contexts/DatabaseContext';
import TransactionHistoryController from '../../controllers/TransactionHistoryController';
import TransactionHistoryStore, { TransactionKindFilter } from '../../database/TransactionHistoryStore';
import { DashboardRange } from '../../dashboard/period';
import useReportPeriod from '../../hooks/useReportPeriod';
import DashboardFilters from '../Dashboard/DashboardFilters';
import '../../styles/Reports.css';
import { TransactionListEntry } from '../../models/TransactionListEntry';
import { PageOptions } from '../../database/Pagination';
import usePagedQuery from '../../hooks/usePagedQuery';
import Price from '../Items/Price';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import PaginationControls from '../utils/PaginationControls';

export default function TransactionsView({ customerId, range: fixedRange, kind, scope = '', refresh = 0 }: {
  customerId?: string; range?: DashboardRange; kind?: TransactionKindFilter; scope?: string; refresh?: number;
}) {
  const t = useLocaleText();
  const text = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionsOS, database } = useDatabase();
  const period = useReportPeriod('all');
  const range = fixedRange ?? period.range;
  const controller = useMemo(() => new TransactionHistoryController(new TransactionHistoryStore(database), transactionsOS), [database, transactionsOS]);
  const query = useCallback((options: PageOptions) => {
    void refresh;
    return range ? controller.getPage(options, range, kind, customerId) : Promise.reject(new Error());
  }, [range, controller, kind, customerId, refresh]);
  const pagination = usePagedQuery(query, scope);
  const columns: CustomTableColumn<TransactionListEntry>[] = [
    { key: 'time', header: text.TRANSACTION_TABLE_HEADER_TIME, render: row => new Date(row.timestamp).toLocaleString() },
    { key: 'kind', header: t('PAYMENT_TYPE'), render: row => t(row.kind === 'payment' ? 'PAYMENT_TITLE' : 'PAYMENT_SALE') },
    { key: 'items', header: text.TRANSACTION_TABLE_HEADER_NUM_OF_ITEMS, variant: 'numeric', render: row => row.itemCount },
    { key: 'total', header: kind === 'payment' ? t('PAYMENT_AMOUNT') : text.TRANSACTION_TABLE_HEADER_TOTAL, variant: 'numeric', render: row => <Price price={kind === 'payment' ? -row.total : row.total} /> },
  ];
  return <>
    {!fixedRange && <DashboardFilters {...period} />}
    {!range ? <p role="alert">{t('DASH_INVALID')}</p> : <>
    <PaginationControls page={pagination.page} pageSize={pagination.pageSize} sort={pagination.sort} total={pagination.result?.total ?? 0} busy={pagination.loading} onChange={pagination.change} />
    {pagination.error ? <p role="alert">{t('PAGINATION_ERROR')}</p> : pagination.loading ? <p role="status">{t('PAGINATION_LOADING')}</p> :
      <CustomTableView label={t(kind === 'payment' ? 'REPORT_PAYMENTS' : 'TRANSACTIONS_TITLE')} emptyTitle={t(kind === 'payment' ? 'REPORT_NO_PAYMENTS' : 'UI_NO_TRANSACTIONS_YET')} emptyDescription={kind === 'payment' ? undefined : t('UI_POSTED_SALES_WILL_APPEAR_HERE_CREATE_A_SALE_FROM')}
        data={pagination.result?.rows ?? []} columns={columns} rowKey={row => row.id}
        onRowClick={row => navigate(`/transaction?id=${encodeURIComponent(row.id)}`, { state: { returnTo: location.pathname + location.search, returnState: location.state } })} />}
    </>}
  </>;
}
