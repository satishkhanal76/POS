import { ReactNode } from "react";
import "./PrintReportButton.css";

/** Keep export actions beside the controls they apply to, wrapping on small screens. */
export default function ReportToolbar({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="report-toolbar">
      <div className="report-toolbar-controls">{children}</div>
      <div className="report-toolbar-actions">{actions}</div>
    </div>
  );
}
