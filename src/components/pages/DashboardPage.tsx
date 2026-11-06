import { useState } from 'react';
import { Link } from 'react-router-dom';
import useReportPeriod from '../../hooks/useReportPeriod';
import useDashboardSummary from '../../hooks/useDashboardSummary';
import { useLocaleText } from '../../contexts/Locale';
import PageHeader from '../Layout/PageHeader';
import DashboardFilters from '../Dashboard/DashboardFilters';
import CollapsibleReport from '../utils/CollapsibleReport';
import TransactionsView from '../Transactions/TransactionsView';
import CustomersHandled from '../Dashboard/CustomersHandled';
import TopSellingItems from '../Dashboard/TopSellingItems';
import '../../styles/Reports.css';

export default function DashboardPage() {
  const t = useLocaleText();
  const period = useReportPeriod('day');
  const [refresh, setRefresh] = useState(0);
  const { data, busy, error } = useDashboardSummary(period.range, refresh);
  const key = `${period.range?.start}:${period.range?.end}`;
  return <main className="dashboard-page">
    <PageHeader title={t('REPORT_DASHBOARD')} description={t('REPORT_DASHBOARD_HELP')} actions={<>
      <Link to={`/overview?${period.periodParams}`}>{t('REPORT_OVERVIEW')}</Link>
      <button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{t('DASH_REFRESH')}</button>
    </>} />
    <DashboardFilters {...period} />
    {!period.range ? <p role="alert">{t('DASH_INVALID')}</p> : <>
      <CollapsibleReport title={t('REPORT_TRANSACTIONS')}><TransactionsView range={period.range} kind="sale" scope="sales" refresh={refresh} /></CollapsibleReport>
      <CollapsibleReport title={t('REPORT_PAYMENTS')}><TransactionsView range={period.range} kind="payment" scope="payments" refresh={refresh} /></CollapsibleReport>
      {busy ? <p role="status">{t('DASH_LOADING')}</p> : error ? <p role="alert">{t('DASH_ERROR')}</p> : data && <>
        <CollapsibleReport title={t('DASH_CUSTOMERS')}><CustomersHandled key={key} rows={data.handledCustomers} periodParams={period.periodParams} /></CollapsibleReport>
        <TopSellingItems key={key} items={data.topItems} title="REPORT_ITEMS_SOLD" />
      </>}
    </>}
  </main>;
}
