import { CustomTableColumn } from "../utils/CustomTableView";
import { PrintableSection } from "../../reports/types";
import { isDeleted } from "../../deletion/state";
import { getLocaleText } from "../../localization/locale";

/** Print every supplied row, omitting interactive action columns. */
export default function printTable<T>(
  title: string,
  rows: T[],
  columns: CustomTableColumn<T>[],
): PrintableSection {
  const visible = columns.filter((column) => column.variant !== "actions");
  return {
    title,
    columns: visible.map((column) => column.header),
    rows: rows.map((row) =>
      visible.map((column, index) => (
        <>
          {column.render(row)}
          {index === 0 &&
            (isDeleted(row) ||
              isDeleted((row as { customer?: unknown }).customer)) && (
              <small> · {getLocaleText("DELETED_BADGE")}</small>
            )}
        </>
      )),
    ),
  };
}
