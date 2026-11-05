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
  data, columns, rowKey, onRowClick, label = 'Records',
  emptyTitle = 'No records yet', emptyDescription = 'Records will appear here when you add them.',
}: CustomTableProps<T>) {
  const isInteractiveTarget = (target: EventTarget | null) => target instanceof Element
    && !!target.closest('a, button, input, select, textarea, [role="button"]');

  return (
    <div className="table-card">
      <div className="table-scroll" role="region" aria-label={`${label} table`} tabIndex={0}>
        <table className="custom-table" aria-label={label}>
          <thead><tr>{columns.map(column => (
            <th key={column.key} scope="col" data-align={column.align || (column.variant === 'numeric' || column.variant === 'actions' ? 'right' : 'left')}>
              {column.header || (column.variant === 'actions' ? 'Actions' : '')}
            </th>
          ))}</tr></thead>
          <tbody>
            {data.map(row => (
              <tr key={rowKey(row)} className={onRowClick ? 'table-row-clickable' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `Open ${label.toLowerCase()} record ${rowKey(row)}` : undefined}
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
      <footer className="table-footer"><span>{data.length} {data.length === 1 ? 'record' : 'records'}</span>{onRowClick && data.length > 0 && <span>Select a row to view details</span>}</footer>
    </div>
  );
}
