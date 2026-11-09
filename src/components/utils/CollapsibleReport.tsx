import { ReactNode, useContext } from "react";

import { ReportViewDefaults } from "../../reports/ReportViewDefaults";

/** Native disclosure keeps report details keyboard accessible and collapsed by default. */
export default function CollapsibleReport({
  title,
  children,
  nested = false,
}: {
  title: string;
  children: ReactNode;
  nested?: boolean;
}) {
  const { startCollapsed } = useContext(ReportViewDefaults);
  return (
    <details
      open={!startCollapsed}
      className={`report-disclosure ${nested ? "report-disclosure-nested" : "dashboard-panel"}`}
    >
      <summary>{title}</summary>
      <div className="report-disclosure-content">{children}</div>
    </details>
  );
}
