import useDashboardSummary from '../../hooks/useDashboardSummary';
import DashboardFilters from '../Dashboard/DashboardFilters';
import DashboardMetrics from '../Dashboard/DashboardMetrics';
import DashboardTrend from '../Dashboard/DashboardTrend';
import TopSellingItems from '../Dashboard/TopSellingItems';
import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { DashboardPeriod, dashboardRange, dateInput } from '../../dashboard/period';
import PageHeader from '../Layout/PageHeader';
import '../../styles/Reports.css';
import CustomerBalances from '../Customer/CustomerBalances';
import CollapsibleReport from '../utils/CollapsibleReport';

export default function DashboardPage() {
  const t = useLocaleText();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [anchor, setAnchor] = useState(() => dateInput(new Date()));
  const [end, setEnd] = useState(() => dateInput(new Date()));
  const [refresh, setRefresh] = useState(0);
  const range = dashboardRange(period, anchor, end);
  const { data, busy, error } = useDashboardSummary(range, refresh);
  return <main className="dashboard-page">
    <PageHeader title={t('DASH_TITLE')} description={t('DASH_DESCRIPTION')} actions={<button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{t('DASH_REFRESH')}</button>} />
    <DashboardFilters period={period} anchor={anchor} end={end} range={range} onPeriod={setPeriod} onAnchor={setAnchor} onEnd={setEnd} />
    {!range ? <p role="alert">{t('DASH_INVALID')}</p> : busy ? <p role="status">{t('DASH_LOADING')}</p> : error ? <p role="alert">{t('DASH_ERROR')}</p> : data && <>
      {!data.salesCount && !data.paymentCount && <p role="status">{t('DASH_EMPTY')}</p>}
      <DashboardMetrics data={data} />
      <DashboardTrend data={data} />
      <TopSellingItems items={data.topItems} />
    </>}
    <CollapsibleReport title={t('DASH_BALANCES')}><CustomerBalances refresh={refresh} embedded /></CollapsibleReport>
  </main>;
}
