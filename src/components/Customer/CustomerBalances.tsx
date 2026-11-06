import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import useDeletionRevision from '../../hooks/useDeletionRevision';
import Select from '../Forms/Select';
import '../../styles/Reports.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocaleText } from '../../contexts/Locale';
import CustomerBalancesOS, { BalanceFilter, CustomerBalance } from '../../database/CustomerBalancesOS';
import CustomTableView, { CustomTableColumn } from '../utils/CustomTableView';
import Price from '../Items/Price';

type Result = Awaited<ReturnType<CustomerBalancesOS['getPage']>>;
export default function CustomerBalances({ refresh = 0, embedded = false }: { refresh?: number; embedded?: boolean }) {
  const t = useLocaleText();
  const { includeDeleted } = useDeletedVisibility();
  const revision = useDeletionRevision();
  const { database } = useDatabase();
  const store = useMemo(() => new CustomerBalancesOS(database), [database]);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BalanceFilter>('owing');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError(false);
    const timer = window.setTimeout(() => {
      store.getPage({ filter, search, page, pageSize, includeDeleted }).then(data => { if (!cancelled) setResult(data); })
        .catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setBusy(false); });
    }, 150);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [store, filter, search, page, pageSize, refresh, includeDeleted, revision]);
  const columns: CustomTableColumn<CustomerBalance>[] = [
    { key: 'name', header: t('CUSTOMER_TABLE_HEADER_NAME'), render: row => row.name },
    { key: 'phone', header: t('DASH_PHONE'), render: row => row.phoneNumber },
    { key: 'balance', header: t('PAYMENT_BALANCE'), variant: 'numeric', render: row => <Price price={row.balance} /> },
    { key: 'status', header: t('DASH_STATUS'), render: row => t(row.balance > 0 ? 'DASH_OWING' : row.balance < 0 ? 'DASH_CREDIT' : 'DASH_SETTLED') },
    { key: 'activity', header: t('PAYMENT_ACTIVITY'), render: row => row.timestamp ? new Date(row.timestamp).toLocaleDateString() : t('DASH_NO_ACTIVITY') },
  ];
  return <section className={embedded ? "customer-balances" : "dashboard-panel customer-balances"} aria-labelledby="customer-balances-title">
    <h2 id="customer-balances-title" hidden={embedded}>{t('DASH_BALANCES')}</h2><p className="dashboard-note">{t('DASH_BALANCES_HELP')}</p>
    {!busy && !error && result && <div className="dashboard-balance-totals">
      <p>{t('DASH_OUTSTANDING')}: <Price price={result.outstanding} /></p><p>{t('DASH_OWING_COUNT')}: {result.owingCount}</p><p>{t('DASH_CREDIT_TOTAL')}: <Price price={result.credit} /></p>
    </div>}
    <div className="dashboard-filters">
      <label>{t('DASH_STATUS')}<Select value={filter} onChange={value => { setFilter(value as BalanceFilter); setPage(1); }}>
        <option value="owing">{t('DASH_OWING')}</option><option value="settled">{t('DASH_SETTLED')}</option><option value="credit">{t('DASH_CREDIT')}</option><option value="all">{t('DASH_ALL_CUSTOMERS')}</option>
      </Select></label>
      <label>{t('DASH_SEARCH_CUSTOMERS')}<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
      <label>{t('DASH_PAGE_SIZE')}<Select value={pageSize} onChange={value => { setPageSize(Number(value)); setPage(1); }}><option value={0}>{t('REPORT_ALL')}</option>{[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</Select></label>
    </div>
    {busy ? <p role="status">{t('DASH_LOADING')}</p> : error ? <p role="alert">{t('DASH_ERROR')}</p> : result && <>
      <CustomTableView label={t('DASH_BALANCES')} emptyTitle={t('DASH_NO_CUSTOMERS')} data={result.rows} columns={columns} rowKey={row => row.id} onRowClick={row => navigate(`/customer-transactions?id=${encodeURIComponent(row.id)}${includeDeleted ? '&deleted=1' : ''}`)} />
      <div className="dashboard-pagination"><button type="button" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)}>{t('DASH_PREVIOUS')}</button>
        <span>{t('DASH_PAGE', { page: result.page, pages: Math.max(1, Math.ceil(result.total / (result.pageSize || Math.max(1, result.total)))), count: result.total })}</span>
        <button type="button" disabled={!result.pageSize || result.page * result.pageSize >= result.total} onClick={() => setPage(result.page + 1)}>{t('DASH_NEXT')}</button></div>
    </>}
  </section>;
}
