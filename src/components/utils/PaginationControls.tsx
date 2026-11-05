import { useId } from 'react';
import { useLocaleText } from '../../contexts/Locale';
import { PageOptions } from '../../database/Pagination';
import './PaginationControls.css';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  sort: PageOptions['sort'];
  total: number;
  busy: boolean;
  onChange: (changes: Partial<PageOptions>) => void;
}
export default function PaginationControls({ page, pageSize, sort, total, busy, onChange }: PaginationControlsProps) {
  const t = useLocaleText();
  const id = useId();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination-controls">
    <div className="pagination-options">
      <div className="pagination-field"><label htmlFor={`${id}-sort`}>{t('PAGINATION_SORT')}</label><select id={`${id}-sort`} value={sort} onChange={event => onChange({ sort: event.target.value === 'oldest' ? 'oldest' : 'newest' })}>
        <option value="newest">{t('PAGINATION_NEWEST')}</option><option value="oldest">{t('PAGINATION_OLDEST')}</option>
      </select></div>
      <div className="pagination-field"><label htmlFor={`${id}-size`}>{t('PAGINATION_PAGE_SIZE')}</label><select id={`${id}-size`} value={pageSize} onChange={event => onChange({ pageSize: Number(event.target.value) })}>
        {[10, 25, 50, 100].map(size => <option value={size} key={size}>{size}</option>)}
      </select></div>
    </div>
    <div className="pagination-navigation">
      <span role="status">{busy ? t('PAGINATION_LOADING') : t('PAGINATION_RANGE', { start: total ? (page - 1) * pageSize + 1 : 0, end: Math.min(page * pageSize, total), total })}</span>
      <button type="button" disabled={busy || page <= 1} onClick={() => onChange({ page: page - 1 })}>{t('PAGINATION_PREVIOUS')}</button>
      <span>{!busy && t('PAGINATION_PAGE_NUMBER', { page, pages: pageCount })}</span>
      <button type="button" disabled={busy || page >= pageCount} onClick={() => onChange({ page: page + 1 })}>{t('PAGINATION_NEXT')}</button>
    </div>
  </div>;
}
