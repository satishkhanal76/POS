import { useLocaleText } from '../../contexts/Locale';
import { ReactNode } from 'react';
import './CustomTableView.css';

export interface CustomTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  variant?: 'default' | 'numeric' | 'actions';
}

export interface CustomTableProps<T> {
  data: T[];
  columns: CustomTableColumn<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  label?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/** Shared table presentation; columns and domain operations belong to each view. */
export default function CustomTableView<T>({
  data, columns, rowKey, onRowClick, label: providedLabel,
  emptyTitle: providedEmptyTitle, emptyDescription: providedEmptyDescription,
}: CustomTableProps<T>) {
  const t = useLocaleText();
  const label = providedLabel ?? t("UI_RECORDS_2");
  const emptyTitle = providedEmptyTitle ?? t("UI_NO_RECORDS_YET");
  const emptyDescription = providedEmptyDescription ?? t("UI_RECORDS_WILL_APPEAR_HERE_WHEN_YOU_ADD_THEM");
  const isInteractiveTarget = (target: EventTarget | null) => target instanceof Element
    && !!target.closest('a, button, input, select, textarea, [role="button"]');

  return (
    <div className="table-card">
      <div className="table-scroll" role="region" aria-label={t('UI_VALUE_TABLE', { value0: label })} tabIndex={0}>
        <table className="custom-table" aria-label={label}>
          <thead><tr>{columns.map(column => (
            <th key={column.key} scope="col" data-align={column.align || (column.variant === 'numeric' || column.variant === 'actions' ? 'right' : 'left')}>
              {column.header || (column.variant === 'actions' ? t('UI_ACTIONS') : '')}
            </th>
          ))}</tr></thead>
          <tbody>
            {data.map(row => (
              <tr key={rowKey(row)} className={onRowClick ? 'table-row-clickable' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? t('UI_OPEN_VALUE_RECORD_VALUE', { value0: label.toLowerCase(), value1: rowKey(row) }) : undefined}
                onClick={event => { if (!isInteractiveTarget(event.target)) onRowClick?.(row); }}
                onKeyDown={event => {
                  if (event.target === event.currentTarget && onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault(); onRowClick(row);
                  }
                }}>
                {columns.map(column => (
                  <td key={column.key} data-align={column.align || (column.variant === 'numeric' || column.variant === 'actions' ? 'right' : 'left')} data-variant={column.variant || 'default'}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {!data.length && <tr><td colSpan={columns.length} className="table-empty">
              <div className="table-empty-icon" aria-hidden="true">≡</div><h3>{emptyTitle}</h3><p>{emptyDescription}</p>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="table-footer"><span>{t(data.length === 1 ? 'TABLE_RECORD_COUNT_ONE' : 'TABLE_RECORD_COUNT_OTHER', { count: data.length })}</span>{onRowClick && data.length > 0 && <span>{t('UI_SELECT_A_ROW_TO_VIEW_DETAILS')}</span>}</footer>
    </div>
  );
}
