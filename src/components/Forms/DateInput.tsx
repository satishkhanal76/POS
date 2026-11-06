import { useId, useState } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { dateInput } from '../../dashboard/period';
import FullScreenModal from '../Modals/FullScreenModal';
import Select from './Select';
import './DateInput.css';

export default function DateInput({ value, onChange, min }: { value: string; onChange: (date: string) => void; min?: string }) {
  const t = useLocaleText();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const openCalendar = () => {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date();
    setMonth(Number.isFinite(parsed.getTime()) ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date());
    setOpen(true);
  };
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const move = (direction: number) => setMonth(new Date(year, monthIndex + direction, 1));
  const select = (date: string) => { onChange(date); setOpen(false); };
  return <span className="app-date-input">
    <input id={id} type="text" inputMode="numeric" value={value} placeholder={t('FORM_DATE_FORMAT')} onChange={event => onChange(event.target.value)} />
    <button type="button" className="app-date-trigger" onClick={openCalendar} aria-label={t('FORM_PICK_DATE')} aria-haspopup="dialog">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 3v4m10-4v4M3 11h18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
    {open && <FullScreenModal title={t('FORM_PICK_DATE')} onClose={() => setOpen(false)}>
      <div className="app-calendar">
        <div className="app-calendar-controls">
          <button type="button" onClick={() => move(-1)} disabled={year <= 100 && monthIndex === 0} aria-label={t('FORM_PREVIOUS_MONTH')}>‹</button>
          <label><span>{t('FORM_MONTH')}</span><Select value={monthIndex} onChange={value => setMonth(new Date(year, Number(value), 1))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Date(2024, index, 1).toLocaleDateString(undefined, { month: 'long' })}</option>)}</Select></label>
          <label><span>{t('FORM_YEAR')}</span><input type="number" value={year} min="100" max="9999" onChange={event => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 100 && next <= 9999) setMonth(new Date(next, monthIndex, 1)); }} /></label>
          <button type="button" onClick={() => move(1)} disabled={year >= 9999 && monthIndex === 11} aria-label={t('FORM_NEXT_MONTH')}>›</button>
        </div>
        <div className="app-calendar-grid">
          {Array.from({ length: 7 }, (_, index) => <span className="app-calendar-weekday" key={`weekday-${index}`}>{new Date(2024, 0, 1 + index).toLocaleDateString(undefined, { weekday: 'short' })}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = new Date(year, monthIndex, index + 1);
            const iso = dateInput(date);
            return <button type="button" key={iso} disabled={!!min && iso < min} aria-label={date.toLocaleDateString(undefined, { dateStyle: 'full' })} aria-pressed={iso === value} aria-current={iso === dateInput(new Date()) ? 'date' : undefined} onClick={() => select(iso)}>{index + 1}</button>;
          })}
        </div>
        <div className="app-calendar-footer"><button type="button" disabled={!!min && dateInput(new Date()) < min} onClick={() => select(dateInput(new Date()))}>{t('FORM_TODAY')}</button><button type="button" onClick={() => setOpen(false)}>{t('UI_CANCEL')}</button></div>
      </div>
    </FullScreenModal>}
  </span>;
}
