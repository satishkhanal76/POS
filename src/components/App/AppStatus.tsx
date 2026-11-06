import { useState } from "react";
import { usePwa } from "../../pwa/PwaContext";
import { useLocaleText } from "../../contexts/Locale";
import "./AppStatus.css";

export default function AppStatus() {
  const t = useLocaleText();
  const { online, needRefresh, update } = usePwa();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (online && !needRefresh) return null;
  return (
    <aside className="app-status" aria-live="polite">
      {!online && <p>{t("PWA_OFFLINE")}</p>}
      {needRefresh && (
        <div className="app-status-update">
          <p>{t("PWA_UPDATE_AVAILABLE")}</p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setFailed(false);
              try {
                await update();
              } catch {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t(busy ? "PWA_UPDATING" : "PWA_UPDATE_ACTION")}
          </button>
        </div>
      )}
      {failed && <p role="alert">{t("PWA_UPDATE_FAILED")}</p>}
    </aside>
  );
}
