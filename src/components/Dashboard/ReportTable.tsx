import ReportToolbar from "../Reports/ReportToolbar";
import { ReportPrintContext } from "../../reports/ReportPrintContext";
import PrintReportButton from "../Reports/PrintReportButton";
import printTable from "../Reports/printTable";
import { useContext, useState } from "react";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import PaginationControls from "../utils/PaginationControls";

/** Aggregated reports page their completed projections; each section owns its controls. */
export default function ReportTable<T>({
  rows,
  columns,
  label,
  rowKey,
  onRowClick,
}: {
  rows: T[];
  columns: CustomTableColumn<T>[];
  label: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const range = useContext(ReportPrintContext);
  const [pageSize, setSize] = useState(10);
  const [requestedPage, setPage] = useState(1);
  const size = pageSize || Math.max(1, rows.length);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(rows.length / size)),
  );
  return (
    <>
      <ReportToolbar
        actions={
          <PrintReportButton
            createReport={() => ({
              title: label,
              range,
              sections: [printTable(label, rows, columns)],
            })}
          />
        }
      >
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={rows.length}
          sort="newest"
          showSort={false}
          busy={false}
          onChange={(change) => {
            if (change.pageSize !== undefined) setSize(change.pageSize);
            setPage(change.page ?? 1);
          }}
        />
      </ReportToolbar>
      <CustomTableView
        label={label}
        data={rows.slice((page - 1) * size, page * size)}
        columns={columns}
        rowKey={rowKey}
        onRowClick={onRowClick}
      />
    </>
  );
}
