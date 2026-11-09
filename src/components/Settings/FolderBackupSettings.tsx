import { useState } from "react";
import {
  backupIntervals,
  BackupInterval,
  chooseBackupFolder,
} from "../../backup/folderAccess";
import { useFolderBackup } from "../../contexts/FolderBackupContext";
import { useLocaleText } from "../../contexts/Locale";
import Select from "../Forms/Select";

export default function FolderBackupSettings({
  disabled,
}: {
  disabled: boolean;
}) {
  const t = useLocaleText();
  const { controller, supported, settings, busy, error, run } =
    useFolderBackup();
  const [initialInterval, setInitialInterval] = useState<BackupInterval>(24);
  const unavailable = busy || disabled;
  return (
    <div className="backup-preview">
      <h4>{t("FOLDER_BACKUP_TITLE")}</h4>
      <p>{t(supported ? "FOLDER_BACKUP_HELP" : "FOLDER_BACKUP_UNSUPPORTED")}</p>
      {supported && (
        <>
          <label className="pagination-field">
            {t("FOLDER_BACKUP_INTERVAL")}
            <Select
              disabled={unavailable}
              value={settings?.interval ?? initialInterval}
              onChange={(value) => {
                const interval = Number(value) as BackupInterval;
                if (settings) void run(() => controller.setInterval(interval));
                else setInitialInterval(interval);
              }}
            >
              <option value={backupIntervals[0]}>
                {t("FOLDER_BACKUP_HOURLY")}
              </option>
              <option value={backupIntervals[1]}>
                {t("FOLDER_BACKUP_SIX_HOURS")}
              </option>
              <option value={backupIntervals[2]}>
                {t("FOLDER_BACKUP_DAILY")}
              </option>
            </Select>
          </label>
          {settings && (
            <p>
              {t("FOLDER_BACKUP_STATUS", {
                folder: settings.directory.name,
                date: new Date(settings.savedAt).toLocaleString(),
              })}{" "}
              · {t(settings.enabled ? "UI_ON" : "UI_OFF")}
            </p>
          )}
          <div className="workspace-buttons">
            <button
              type="button"
              disabled={unavailable}
              onClick={() =>
                void run(async () => {
                  const directory = await chooseBackupFolder("readwrite");
                  await controller.enable(
                    directory,
                    settings?.interval ?? initialInterval,
                  );
                })
              }
            >
              {t(settings ? "FOLDER_BACKUP_CHANGE" : "FOLDER_BACKUP_CHOOSE")}
            </button>
            {settings && (
              <>
                <button
                  type="button"
                  disabled={unavailable}
                  onClick={() =>
                    void run(() => controller.setEnabled(!settings.enabled))
                  }
                >
                  {t(
                    settings.enabled
                      ? "FOLDER_BACKUP_PAUSE"
                      : "FOLDER_BACKUP_RESUME",
                  )}
                </button>
                <button
                  type="button"
                  disabled={unavailable}
                  onClick={() =>
                    void run(async () => {
                      // Request permission from the click, before any async database lookup.
                      if (
                        (await settings.directory.requestPermission({
                          mode: "readwrite",
                        })) !== "granted"
                      )
                        throw new Error(t("FOLDER_BACKUP_PERMISSION"));
                      await controller.backup(true);
                    })
                  }
                >
                  {t("FOLDER_BACKUP_NOW")}
                </button>
              </>
            )}
          </div>
          {(busy || error) && (
            <p role="status">{busy ? t("UI_WORKING") : error}</p>
          )}
        </>
      )}
    </div>
  );
}
