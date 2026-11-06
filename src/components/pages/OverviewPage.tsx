import { ReportPrintContext } from '../../reports/ReportPrintContext';
import WorkspaceReportPrintButton from '../Reports/WorkspaceReportPrintButton';
import { Link } from 'react-router-dom';
import useDashboardSummary from '../../hooks/useDashboardSummary';
import DashboardFilters from '../Dashboard/DashboardFilters';
import DashboardMetrics from '../Dashboard/DashboardMetrics';
import DashboardTrend from '../Dashboard/DashboardTrend';
import TopSellingItems from '../Dashboard/TopSellingItems';
import { useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import useReportPeriod from '../../hooks/useReportPeriod';
import PageHeader from '../Layout/PageHeader';
import '../../styles/Reports.css';
import CustomerBalances from '../Customer/CustomerBalances';
import CollapsibleReport from '../utils/CollapsibleReport';

export default function OverviewPage() {
  const t = useLocaleText();
  const period = useReportPeriod('month');
  const [refresh, setRefresh] = useState(0);
  const { range } = period;
  const { data, busy, error } = useDashboardSummary(range, refresh);
  return <ReportPrintContext.Provider value={range}><main className="dashboard-page">
    <PageHeader title={t('REPORT_OVERVIEW')} description={t('DASH_DESCRIPTION')} actions={<><WorkspaceReportPrintButton range={range} mode="overview" /><Link to={`/dashboard?${period.periodParams}`}>{t('DASH_NAV')}</Link><button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{t('DASH_REFRESH')}</button></>} />
    <DashboardFilters {...period} />
    {!range ? <p role="alert">{t('DASH_INVALID')}</p> : busy ? <p role="status">{t('DASH_LOADING')}</p> : error ? <p role="alert">{t('DASH_ERROR')}</p> : data && <>
      {!data.salesCount && !data.paymentCount && <p role="status">{t('DASH_EMPTY')}</p>}
      <DashboardMetrics data={data} />
      <DashboardTrend data={data} />
      <TopSellingItems items={data.topItems} />
    </>}
    <CollapsibleReport title={t('DASH_BALANCES')}><CustomerBalances refresh={refresh} embedded /></CollapsibleReport>
  </main></ReportPrintContext.Provider>;
}
