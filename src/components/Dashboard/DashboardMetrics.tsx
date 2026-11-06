import { useLocaleText } from '../../contexts/Locale';
import { DashboardSummary } from '../../controllers/DashboardController';
import Price from '../Items/Price';

export default function DashboardMetrics({ data }: { data: DashboardSummary }) {
  const t = useLocaleText();
  const metrics = [
    { label: 'DASH_SALES', value: data.sales, money: true, note: 'DASH_SALES_HELP' },
    { label: 'DASH_SALE_COUNT', value: data.salesCount },
    { label: 'DASH_PAYMENTS', value: data.payments, money: true, note: 'DASH_PAYMENTS_HELP' },
    { label: 'DASH_CUSTOMERS', value: data.customers, note: 'DASH_CUSTOMERS_HELP' },
    { label: 'DASH_AVERAGE', value: data.averageSale, money: true },
    { label: 'DASH_UNITS', value: data.units },
    { label: 'DASH_PAYMENT_COUNT', value: data.paymentCount },
    { label: 'DASH_UNLINKED', value: data.unlinkedSales },
    { label: 'DASH_MOVEMENT', value: data.balanceMovement, money: true, note: 'DASH_MOVEMENT_HELP' },
  ] as const;
  return (<section className="dashboard-metrics" aria-label={t('DASH_OVERVIEW')}>
        {metrics.map(metric => <article className="dashboard-metric" key={metric.label}><h2>{t(metric.label)}</h2>
          <div className="dashboard-value">{'money' in metric ? <Price price={metric.value} /> : metric.value.toLocaleString()}</div>
          {'note' in metric && <p>{t(metric.note)}</p>}
        </article>)}
      </section>);
}
