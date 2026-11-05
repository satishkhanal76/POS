import { getLocaleText } from '../contexts/Locale';
import { IDB } from '../database/Database';
import DatabaseBackupStore, { DatabaseBackup, validateBackup } from '../database/DatabaseBackup';

export default class BackupController {
  private readonly store: DatabaseBackupStore;
  constructor(database: IDB) { this.store = new DatabaseBackupStore(database); }

  public async download(): Promise<void> {
    const backup = await this.store.export();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${backup.sourceDatabase}-backup-${backup.createdAt.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public async inspect(file: File): Promise<DatabaseBackup> {
    let value: unknown;
    try { value = JSON.parse(await file.text()); }
    catch { throw new Error(getLocaleText('UI_CHOOSE_A_VALID_JSON_BACKUP_FILE')); }
    return validateBackup(value);
  }

  public async restore(backup: DatabaseBackup): Promise<void> { await this.store.restore(backup); }
}
