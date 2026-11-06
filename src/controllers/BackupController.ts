import { createBackupArchive, readBackupArchive } from '../backup/BackupArchive';
import { IDB } from '../database/Database';
import DatabaseBackupStore, { DatabaseBackup } from '../database/DatabaseBackup';

export default class BackupController {
  private readonly store: DatabaseBackupStore;
  constructor(database: IDB) { this.store = new DatabaseBackupStore(database); }

  public async download(): Promise<void> {
    const backup = await createBackupArchive(this.store);
    const url = URL.createObjectURL(backup.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${backup.sourceDatabase}-backup-${backup.createdAt.replace(/[:.]/g, '-')}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public async inspect(file: File): Promise<DatabaseBackup> {
    return readBackupArchive(file);
  }

  public async restore(backup: DatabaseBackup): Promise<void> { await this.store.restore(backup); }
}
