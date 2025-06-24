import React from 'react'


import "./CustomTableView.css";

export interface CustomTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export interface CustomTableProps<T> {
    data: T[];
    columns: CustomTableColumn<T>[];
    rowKey: (row: T) => string | number;
    onRowClick?: (row: T) => void;
}

function CustomTableView<T>({data, columns, rowKey, onRowClick}: CustomTableProps<T>) {

  return (
    <table className="custom-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
            {columns.map((col) => (
              <td key={String(col.key)} data-label={col.header}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default CustomTableView