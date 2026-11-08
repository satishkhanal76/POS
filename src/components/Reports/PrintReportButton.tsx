import MobilePdfActions from "./MobilePdfActions";
import { createMobilePdf, prefersMobilePdf } from "../../reports/mobilePdf";
import { workspaceController } from "../../controllers/WorkspaceController";
import { useEffect, useRef, useState } from "react";
import { MdPrint } from "react-icons/md";
import { LocaleContext, useLocale, useLocaleText } from "../../contexts/Locale";
import {
  ClientGlobalContext,
  useClientGlobal,
} from "../../contexts/ClientGlobal";
import { useNotifications } from "../../contexts/Notifications";
import { PrintableReport } from "../../reports/types";
import printDocument from "../../reports/printDocument";
import PrintableDocument from "./PrintableDocument";
import "./PrintReportButton.css";

export default function PrintReportButton({
  createReport,
  disabled = false,
  help,
}: {
  createReport: () => PrintableReport | Promise<PrintableReport>;
  disabled?: boolean;
  help?: string;
}) {
  const t = useLocaleText();
  const locale = useLocale();
  const settings = useClientGlobal();
  const { notify } = useNotifications();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [pdf, setPdf] = useState<{ file: File; url: string } | null>(null);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    },
    [pdf],
  );
  return (
    <>
      {pdf && (
        <MobilePdfActions
          file={pdf.file}
          url={pdf.url}
          onClose={() => setPdf(null)}
        />
      )}
      <button
        type="button"
        className="print-report-button"
        disabled={disabled || busy}
        title={help ?? t("PRINT_HELP")}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          try {
            const [report, { renderToStaticMarkup }] = await Promise.all([
              createReport(),
              import("react-dom/server"),
            ]);
            const html =
              "<!doctype html>" +
              renderToStaticMarkup(
                <LocaleContext.Provider value={locale}>
                  <ClientGlobalContext.Provider value={settings}>
                    <PrintableDocument
                      report={report}
                      workspace={t(
                        workspaceController.isDemo()
                          ? "WORKSPACE_DEMO"
                          : "WORKSPACE_REAL",
                      )}
                      language={document.documentElement.lang || "en"}
                    />
                  </ClientGlobalContext.Provider>
                </LocaleContext.Provider>,
              );
            if (prefersMobilePdf()) {
              const file = await createMobilePdf(html);
              setPdf({ file, url: URL.createObjectURL(file) });
            } else await printDocument(html);
          } catch {
            notify(t("PRINT_FAILED"), "error");
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <MdPrint aria-hidden="true" />
        {t(busy ? "PRINT_PREPARING" : "PRINT_ACTION")}
      </button>
    </>
  );
}
