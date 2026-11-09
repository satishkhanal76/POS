import FolderBackupSettings from "./FolderBackupSettings";
import { useFolderBackup } from "../../contexts/FolderBackupContext";
import { chooseBackupFolder } from "../../backup/folderAccess";
import { readFolderArchive } from "../../backup/folderArchive";
import { BackupProgress } from "../../backup/progress";
import BackupExportProgress from "./BackupExportProgress";
import { hasUnfinishedRestore } from "../../backup/restoreStatus";
import "./BackupSettings.css";
import { useLocaleText, LocaleKey } from "../../contexts/Locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import BackupController from "../../controllers/BackupController";
import { DatabaseBackup, RestoreProgress } from "../../database/DatabaseBackup";
import { workspaceController } from "../../controllers/WorkspaceController";

export default function BackupSettings() {
  const t = useLocaleText();
  const folder = useFolderBackup();
  const folderInput = useRef<HTMLInputElement>(null);
  const { database } = useDatabase();
  const controller = useMemo(() => new BackupController(database), [database]);
  const [backup, setBackup] = useState<DatabaseBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [restored, setRestored] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<BackupProgress | null>(null);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const restoring = useRef(false);
  const lastProgress = useRef(0);
  useEffect(() => {
    let cancelled = false;
    void database.getDatabase().then((db) => {
      if (!cancelled) setInterrupted(hasUnfinishedRestore(db.name));
    });
    return () => {
      cancelled = true;
    };
  }, [database]);
  const restoreActive = progress !== null;
  useEffect(() => {
    if (!restoreActive) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [restoreActive]);
  const input = useRef<HTMLInputElement>(null);
  const tableLabels: Record<string, LocaleKey> = {
    PURCHASES: "BUY_PURCHASE",
    PURCHASE_LINES: "BUY_LINES",
    SUPPLIER_PAYMENTS: "BUY_PAYMENTS",
    STOCK: "STOCK_TITLE",
    CUSTOMER_TRANSACTION_SUMMARIES: "TABLE_CUSTOMER_TRANSACTION_SUMMARIES",
    PRODUCTS: "TABLE_PRODUCTS",
    CUSTOMER: "TABLE_CUSTOMER",
    DISCOUNTS: "TABLE_DISCOUNTS",
    TRANSACTIONS: "TABLE_TRANSACTIONS",
    TRANSACTION_PRODUCTS: "TABLE_TRANSACTION_PRODUCTS",
    TRANSACTION_DISCOUNTS: "TABLE_TRANSACTION_DISCOUNTS",
    CUSTOMERS_TRANSACTIONS: "TABLE_CUSTOMERS_TRANSACTIONS",
    ITEM_PRICE_CHANGES: "TABLE_ITEM_PRICE_CHANGES",
  };
  const workspace = t(
    workspaceController.isDemo() ? "WORKSPACE_DEMO" : "WORKSPACE_REAL",
  );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setStatus("");
    try {
      await action();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(
        error instanceof Error
          ? error.message
          : t("UI_BACKUP_OPERATION_FAILED_PLEASE_TRY_AGAIN"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-section" aria-labelledby="backup-title">
      <h3 id="backup-title">{t("UI_DATABASE_BACKUP")}</h3>
      <p>{t("BACKUP_DESCRIPTION", { workspace })}</p>
      {interrupted && <p role="alert">{t("RESTORE_INTERRUPTED")}</p>}
      <p>
        {t(
          "UI_BACKUPS_CONTAIN_DATABASE_RECORDS_DISPLAY_SETTINGS_ARE_SAVED_SEPARATELY",
        )}
      </p>
      <div className="workspace-buttons">
        <button
          type="button"
          disabled={busy || restored}
          onClick={() =>
            void run(async () => {
              try {
                await controller.download(setDownloadProgress);
              } finally {
                setDownloadProgress(null);
              }
              setStatus(t("UI_BACKUP_DOWNLOAD_STARTED"));
            })
          }
        >
          {t("UI_DOWNLOAD_FULL_BACKUP")}
        </button>
        <button
          type="button"
          disabled={busy || restored}
          onClick={() => input.current?.click()}
        >
          {t("UI_CHOOSE_BACKUP_TO_RESTORE")}
        </button>
        <button
          type="button"
          disabled={busy || restored || folder.busy}
          onClick={() => {
            if (!folder.supported) {
              folderInput.current?.click();
              return;
            }
            void run(async () => {
              const directory = await chooseBackupFolder("read");
              setBackup(await folder.controller.inspect(directory));
            });
          }}
        >
          {t("FOLDER_BACKUP_RECOVER")}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        aria-label={t("UI_CHOOSE_DATABASE_BACKUP")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          setBackup(null);
          if (file)
            void run(async () => {
              setBackup(await controller.inspect(file));
            });
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        accept=".zip,.json"
        aria-label={t("FOLDER_BACKUP_FILES")}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length)
            void run(async () => {
              setBackup(
                (
                  await readFolderArchive(
                    new Map(files.map((file) => [file.name, file])),
                  )
                ).backup,
              );
            });
        }}
      />
      <FolderBackupSettings disabled={busy || restored || backup !== null} />
      {backup && !restored && (
        <div className="backup-preview">
          <p>
            <b>{t("BACKUP_SOURCE", { database: backup.sourceDatabase })}</b> ·{" "}
            {new Date(backup.createdAt).toLocaleString()}
          </p>
          <ul>
            {Object.entries(backup.tables).map(([name, rows]) => (
              <li key={name}>
                {t("BACKUP_TABLE_COUNT", {
                  table: tableLabels[name] ? t(tableLabels[name]) : name,
                  count: rows.length,
                })}
              </li>
            ))}
          </ul>
          <p>{t("BACKUP_RESTORE_DESCRIPTION", { workspace })}</p>
          <div className="workspace-buttons">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    t("UI_REPLACE_ALL_DATA_IN_YOUR_VALUE_WORKSPACE_WITH_THIS", {
                      value0: workspace,
                    }),
                  )
                )
                  void run(async () => {
                    if (restoring.current) return;
                    restoring.current = true;
                    setInterrupted(false);
                    try {
                      await controller.restore(backup, (next) => {
                        const now = performance.now();
                        if (
                          next.phase !== "writing" ||
                          next.completed === next.total ||
                          now - lastProgress.current > 100
                        ) {
                          lastProgress.current = now;
                          setProgress(next);
                        }
                      });
                    } finally {
                      restoring.current = false;
                      setProgress(null);
                    }
                    setBackup(null);
                    setRestored(true);
                    setStatus(
                      t(
                        "UI_DATABASE_RESTORED_RELOAD_THE_APP_TO_USE_THE_RESTORED",
                      ),
                    );
                  });
              }}
            >
              {t("BACKUP_REPLACE_WORKSPACE", { workspace })}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBackup(null)}
            >
              {t("UI_CANCEL")}
            </button>
          </div>
        </div>
      )}
      {restored && (
        <div className="workspace-buttons">
          <button type="button" onClick={() => window.location.reload()}>
            {t("UI_RELOAD_APP")}
          </button>
        </div>
      )}
      <BackupExportProgress progress={downloadProgress} />
      {progress && (
        <div className="restore-progress">
          <p role="status">
            {t(
              progress.phase === "validating"
                ? "RESTORE_VALIDATING"
                : progress.phase === "verifying"
                  ? "RESTORE_VERIFYING"
                  : "RESTORE_WRITING",
              {
                done: progress.completed.toLocaleString(),
                total: progress.total.toLocaleString(),
              },
            )}
          </p>
          {progress.phase === "writing" && (
            <div
              className="restore-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total || 1}
              aria-valuenow={progress.completed}
              aria-label={t("RESTORE_PROGRESS")}
            >
              <span
                style={{
                  width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          )}
          <p>{t("RESTORE_KEEP_OPEN")}</p>
        </div>
      )}
      <p role="status">{busy ? t("UI_WORKING") : status}</p>
    </section>
  );
}
