import { useMemo } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocaleText } from '../../contexts/Locale';
import { DashboardRange } from '../../dashboard/period';
import { dashboardMetrics } from '../../dashboard/metrics';
import PrintReportsController from '../../controllers/PrintReportsController';
import { PrintableSection } from '../../reports/types';
import PrintReportButton from './PrintReportButton';
import Price from '../Items/Price';

export default function WorkspaceReportPrintButton({ range, mode }: { range: DashboardRange | null; mode: 'dashboard' | 'overview' }) {
  const t = useLocaleText();
  const stores = useDatabase();
  const controller = useMemo(() => new PrintReportsController(stores), [stores]);
  return <PrintReportButton disabled={!range} createReport={async () => {
    if (!range) throw new Error();
    const { summary, sales, payments } = await controller.getReport(range, mode);
    const status = (deletedAt?: number) => deletedAt ? t('DELETED_BADGE') : '';
    const sections: PrintableSection[] = [];
    if (mode === 'overview') {
      sections.push({ title: t('DASH_OVERVIEW'), columns: [t('PRINT_METRIC'), t('PRINT_VALUE'), t('PRINT_NOTES')], rows: dashboardMetrics(summary).map(metric => [t(metric.label), 'money' in metric ? <Price price={metric.value} /> : metric.value.toLocaleString(), 'note' in metric ? t(metric.note) : '']) });
      sections.push({ title: t('DASH_TREND'), columns: [t('DASH_PERIOD'), t('DASH_SALE_COUNT'), t('DASH_SALES'), t('DASH_PAYMENTS')], rows: summary.buckets.map(bucket => [new Date(bucket.timestamp).toLocaleDateString(undefined, summary.monthly ? { month: 'long', year: 'numeric' } : undefined), bucket.salesCount, <Price price={bucket.sales} />, <Price price={bucket.payments} />]) });
    } else {
      for (const [title, rows, isPayment] of [[t('REPORT_TRANSACTIONS'), sales, false], [t('REPORT_PAYMENTS'), payments, true]] as const) {
        sections.push({ title, columns: [t('PRINT_ID'), t('TRANSACTION_TABLE_HEADER_TIME'), t('PRINT_VALUE'), t('DASH_STATUS')], rows: rows.map(row => [row.id, new Date(row.timestamp).toLocaleString(), <Price price={isPayment ? -row.total : row.total} />, status(row.deletedAt)]) });
      }
      sections.push({ title: t('DASH_CUSTOMERS'), columns: [t('CUSTOMER_NAME'), t('DASH_SALE_COUNT'), t('DASH_SALES'), t('DASH_PAYMENT_COUNT'), t('DASH_PAYMENTS'), t('DASH_STATUS')], rows: summary.handledCustomers.map(row => [row.name, row.salesCount, <Price price={row.sales} />, row.paymentCount, <Price price={row.payments} />, status(row.deletedAt)]) });
    }
    sections.push({ title: t('REPORT_ITEMS_SOLD'), columns: [t('UI_ITEM'), t('DASH_UNITS'), t('DASH_SALE_COUNT'), t('DASH_ITEM_VALUE'), t('DASH_STATUS')], rows: [...summary.topItems].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)).map(row => [row.name, row.quantity, row.salesCount, <Price price={row.gross} />, status(row.deletedAt)]) });
    return { title: t(mode === 'dashboard' ? 'REPORT_DASHBOARD' : 'REPORT_OVERVIEW'), range, note: t('DASH_TOP_ITEMS_HELP'), sections };
  }} />;
}
