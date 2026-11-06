export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'custom' | 'all';
export const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function parseDate(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return null;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return dateInput(date) === value ? date : null;
}
/** Calendar boundaries use the user's local timezone; weeks start on Monday. End is exclusive. */
export function dashboardRange(period: DashboardPeriod, anchor: string, customEnd: string) {
  if (period === 'all') return { start: -8640000000000000, end: 8640000000000000, all: true };
  const start = parseDate(anchor);
  if (!start) return null;
  let end = new Date(start);
  if (period === 'week') { start.setDate(start.getDate() - (start.getDay() + 6) % 7); end = new Date(start); end.setDate(end.getDate() + 7); }
  else if (period === 'month') { start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 1); }
  else if (period === 'year') { start.setMonth(0, 1); end = new Date(start.getFullYear() + 1, 0, 1); }
  else if (period === 'custom') { const last = parseDate(customEnd); if (!last || last < start) return null; end = last; end.setDate(end.getDate() + 1); }
  else end.setDate(end.getDate() + 1);
  if (!Number.isFinite(end.getTime())) return null;
  return { start: start.getTime(), end: end.getTime() };
}
export interface DashboardRange { start: number; end: number; all?: boolean }
