import { useState } from "react";
import { useLocaleText } from "../../contexts/Locale";
import { usePwa } from "../../pwa/PwaContext";

export default function InstallationSettings() {
  const t = useLocaleText();
  const { installed, canInstall, offlineReady, setupFailed, install } =
    usePwa();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"dismissed" | "failed" | null>(null);
  return (
    <section className="settings-section" aria-labelledby="install-app-title">
      <h3 id="install-app-title">{t("PWA_INSTALL_TITLE")}</h3>
      <p>{t(installed ? "PWA_INSTALLED" : "PWA_INSTALL_DESCRIPTION")}</p>
      {canInstall ? (
        <div className="workspace-buttons">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              try {
                if ((await install()) === "dismissed") setStatus("dismissed");
              } catch {
                setStatus("failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("PWA_INSTALL_ACTION")}
          </button>
        </div>
      ) : (
        !installed && <p>{t("PWA_INSTALL_INSTRUCTIONS")}</p>
      )}
      <p>
        {t(
          offlineReady
            ? "PWA_OFFLINE_READY"
            : setupFailed
              ? "PWA_SETUP_FAILED"
              : "PWA_OFFLINE_PREPARING",
        )}
      </p>
      {status && (
        <p role="status">
          {t(
            status === "dismissed"
              ? "PWA_INSTALL_DISMISSED"
              : "PWA_INSTALL_FAILED",
          )}
        </p>
      )}
    </section>
  );
}
