import { PrintableReport } from "../../reports/types";
import { useLocaleText } from "../../contexts/Locale";
import "./PrintReportButton.css";

export default function PrintableDocument({
  report,
  workspace,
  language,
}: {
  report: PrintableReport;
  workspace: string;
  language: string;
}) {
  const t = useLocaleText();
  const range = report.range;
  const period =
    !range || range.all
      ? t("REPORT_ALL_TIME")
      : `${new Date(range.start).toLocaleDateString()} – ${new Date(range.end - 1).toLocaleDateString()}`;
  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <title>
          {report.title} — {period}
        </title>
        <style>{`
    @page { size: A4; margin: 16mm 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17202b; background: white; font: 11px/1.5 Arial, sans-serif; }
    header { border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 22px; }
    h1 { font-size: 24px; margin: 0 0 10px; line-height: 1.25; }
    h2 { font-size: 16px; margin: 24px 0 10px; break-after: avoid; }
    p { margin: 5px 0; }
    .meta, small { color: #536171; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 20px; }
    thead { display: table-header-group; }
    th, td { padding: 8px; border-bottom: 1px solid #d8dee5; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f1f4f7; font-weight: bold; }
    tr { break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
    footer { margin-top: 28px; border-top: 1px solid #d8dee5; padding-top: 8px; color: #536171; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  `}</style>
      </head>
      <body>
        <header>
          <h1>{report.title}</h1>
          <p>
            {report.subtitle ?? `${t("DASH_PERIOD")}: ${period}`}
          </p>
          <p className="meta">{t("PRINT_WORKSPACE", { workspace })}</p>
          <p className="meta">
            {t("PRINT_GENERATED", { date: new Date().toLocaleString() })}
          </p>
          <p className="meta">
            {t(
              range?.includeDeleted
                ? "PRINT_WITH_DELETED"
                : "PRINT_ACTIVE_ONLY",
            )}
          </p>
          {report.note && <p>{report.note}</p>}
        </header>
        {report.sections.map((section, index) => (
          <section key={index}>
            <h2>{section.title}</h2>
            <table>
              <thead>
                <tr>
                  {section.columns.map((column, at) => (
                    <th key={at}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.length ? (
                  section.rows.map((row, at) => (
                    <tr key={at}>
                      {row.map((cell, position) => (
                        <td key={position}>{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={section.columns.length}>{t("PRINT_EMPTY")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}
        <footer>{t("PRINT_FOOTER")}</footer>
      </body>
    </html>
  );
}
