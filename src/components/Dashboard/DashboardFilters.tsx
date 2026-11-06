import DateInput from '../Forms/DateInput';
import Select from '../Forms/Select';
import { useLocaleText } from '../../contexts/Locale';
import { DashboardPeriod, DashboardRange } from '../../dashboard/period';

interface Props { period: DashboardPeriod; anchor: string; end: string; range: DashboardRange | null; onPeriod: (value: DashboardPeriod) => void; onAnchor: (value: string) => void; onEnd: (value: string) => void }
export default function DashboardFilters({ period, anchor, end, range, onPeriod, onAnchor, onEnd }: Props) {
  const t = useLocaleText();
  return <>    <section className="dashboard-filters" aria-label={t('DASH_FILTERS')}>
      <label>{t('DASH_PERIOD')}<Select value={period} onChange={value => onPeriod(value as DashboardPeriod)}>
        <option value="day">{t('DASH_DAY')}</option><option value="week">{t('DASH_WEEK')}</option><option value="month">{t('DASH_MONTH')}</option><option value="year">{t('DASH_YEAR')}</option><option value="custom">{t('DASH_CUSTOM')}</option>
      </Select></label>
      <label>{t(period === 'custom' ? 'DASH_FROM' : 'DASH_DATE')}<DateInput value={anchor} onChange={onAnchor} /></label>
      {period === 'custom' && <label>{t('DASH_TO')}<DateInput value={end} min={anchor} onChange={onEnd} /></label>}
      {range && <p>{new Date(range.start).toLocaleDateString()} – {new Date(range.end - 1).toLocaleDateString()}</p>}
    </section>
    <p className="dashboard-note">{t('DASH_DATES_HELP')}</p>
</>;
}
