import { useLocaleText } from "../../contexts/Locale";
import { useNotifications } from "../../contexts/Notifications";
import FullScreenModal from "../Modals/FullScreenModal";

export default function MobilePdfActions({
  file,
  url,
  onClose,
}: {
  file: File;
  url: string;
  onClose: () => void;
}) {
  const t = useLocaleText();
  const { notify } = useNotifications();
  const canShare = navigator.canShare?.({ files: [file] }) ?? false;
  return (
    <FullScreenModal title={t("PRINT_PDF_READY")} onClose={onClose}>
      <p>{t("PRINT_PDF_MOBILE_HELP")}</p>
      <p className="mobile-pdf-name">{file.name}</p>
      <div className="mobile-pdf-actions">
        {canShare && (
          <button
            type="button"
            onClick={() => {
              // This second tap supplies fresh activation after asynchronous report generation.
              void navigator
                .share({ files: [file], title: file.name })
                .catch((error) => {
                  if (!(error instanceof Error && error.name === "AbortError"))
                    notify(t("PRINT_PDF_SHARE_FAILED"), "error");
                });
            }}
          >
            {t("PRINT_PDF_SHARE")}
          </button>
        )}
        <a href={url} download={file.name}>
          {t("PRINT_PDF_DOWNLOAD")}
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {t("PRINT_PDF_OPEN")}
        </a>
      </div>
    </FullScreenModal>
  );
}
