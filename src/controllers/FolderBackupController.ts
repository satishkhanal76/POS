import { createBackupArchive } from "../backup/BackupArchive";
import { hasUnfinishedRestore } from "../backup/restoreStatus";
import {
  BackupDirectory,
  BackupInterval,
  readFolderSettings,
  saveFolderSettings,
} from "../backup/folderAccess";
import {
  baselineFile,
  changeFile,
  diffBackup,
  folderBackupFiles,
  readFolderArchive,
  writeBackupFile,
} from "../backup/folderArchive";
import { IDB } from "../database/Database";
import DatabaseBackupStore, {
  validateBackup,
} from "../database/DatabaseBackup";
import { getLocaleText } from "../localization/locale";

export default class FolderBackupController {
  private readonly store: DatabaseBackupStore;
  constructor(
    database: IDB,
    readonly workspace: string,
  ) {
    this.store = new DatabaseBackupStore(database);
  }

  private lock<T>(action: () => Promise<T>) {
    return navigator.locks.request("pos-folder-backup", action);
  }

  public settings() {
    return readFolderSettings(this.workspace);
  }

  public enable(directory: BackupDirectory, interval: BackupInterval) {
    return this.lock(async () => {
      const files = await folderBackupFiles(directory);
      if (
        files.size &&
        !(files.size === 1 && files.get(baselineFile)?.size === 0)
      )
        throw new Error(getLocaleText("FOLDER_BACKUP_ALREADY_EXISTS"));
      if (hasUnfinishedRestore(this.workspace))
        throw new Error(getLocaleText("RESTORE_INTERRUPTED"));
      const archive = await createBackupArchive(this.store);
      await writeBackupFile(directory, baselineFile, archive.blob);
      await saveFolderSettings(this.workspace, {
        directory,
        enabled: true,
        interval,
        checkedAt: Date.now(),
        baseline: archive.createdAt,
        savedAt: archive.createdAt,
      });
    });
  }

  public setEnabled(enabled: boolean) {
    return this.lock(async () => {
      const settings = await this.settings();
      if (settings)
        await saveFolderSettings(this.workspace, { ...settings, enabled });
    });
  }

  public setInterval(interval: BackupInterval) {
    return this.lock(async () => {
      const settings = await this.settings();
      if (settings)
        await saveFolderSettings(this.workspace, { ...settings, interval });
    });
  }

  public backup(force = false) {
    return this.lock(async () => {
      const settings = await this.settings();
      if (
        !settings ||
        (!force &&
          (!settings.enabled ||
            Date.now() - settings.checkedAt < settings.interval * 3600000))
      )
        return;
      if (hasUnfinishedRestore(this.workspace))
        throw new Error(getLocaleText("RESTORE_INTERRUPTED"));
      const { directory } = settings;
      if (
        (await directory.queryPermission({ mode: "readwrite" })) !== "granted"
      )
        throw new Error(getLocaleText("FOLDER_BACKUP_PERMISSION"));
      const previous = await readFolderArchive(
        await folderBackupFiles(directory),
      );
      if (
        previous.baseline !== settings.baseline ||
        previous.backup.sourceDatabase !== this.workspace
      )
        throw new Error(getLocaleText("FOLDER_BACKUP_INVALID"));
      const current = await this.store.export();
      const changes = diffBackup(previous, current);
      // A deleted browser database can reopen empty while its separate folder preference survives.
      if (
        Object.values(current.tables).every((rows) => rows.length === 0) &&
        Object.values(previous.backup.tables).some((rows) => rows.length > 0)
      )
        throw new Error(getLocaleText("FOLDER_BACKUP_EMPTY_DATABASE"));
      const changed = Object.keys(changes.tables).length > 0;
      if (changed) {
        validateBackup(current);
        await writeBackupFile(
          directory,
          changeFile(changes.sequence),
          JSON.stringify(changes),
        );
      }
      await saveFolderSettings(this.workspace, {
        ...settings,
        checkedAt: Date.now(),
        savedAt: changed ? current.createdAt : previous.backup.createdAt,
      });
    });
  }

  public async inspect(directory: BackupDirectory) {
    const { backup } = await readFolderArchive(
      await folderBackupFiles(directory),
    );
    return backup;
  }
}
