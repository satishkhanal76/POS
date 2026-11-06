import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { DashboardPeriod, dashboardRange, dateInput } from '../dashboard/period';

/** Shared URL-backed calendar state, reusable in dashboards and transaction history. */
export default function useReportPeriod(defaultPeriod: DashboardPeriod = 'month') {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const requested = params.get('period');
  const period = (['all', 'day', 'week', 'month', 'year', 'custom'].includes(requested || '') ? requested : defaultPeriod) as DashboardPeriod;
  const anchor = params.get('date') ?? dateInput(new Date());
  const end = params.get('end') ?? dateInput(new Date());
  const range = useMemo(() => dashboardRange(period, anchor, end), [period, anchor, end]);
  const update = (key: string, value: string) => setParams(current => {
    const next = new URLSearchParams(current);
    next.set(key, value);
    for (const name of [...next.keys()]) if (name === 'page' || name.endsWith('-page')) next.set(name, '1');
    return next;
  }, { state: location.state });
  const periodParams = new URLSearchParams({ period, date: anchor, end });
  return { period, anchor, end, range, periodParams,
    onPeriod: (value: DashboardPeriod) => update('period', value), onAnchor: (value: string) => update('date', value), onEnd: (value: string) => update('end', value) };
}
