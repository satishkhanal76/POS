import { BackupProgress } from '../backup/progress';
import { createBackupArchive, readBackupArchive } from '../backup/BackupArchive';
import { IDB } from '../database/Database';
import DatabaseBackupStore, { DatabaseBackup, RestoreProgress } from '../database/DatabaseBackup';

export default class BackupController {
  private readonly store: DatabaseBackupStore;
  constructor(database: IDB) { this.store = new DatabaseBackupStore(database); }

  public async download(onProgress?: (progress: BackupProgress) => void): Promise<void> {
    let previous = 0;
    const backup = await createBackupArchive(this.store, progress => {
      const now = performance.now();
      if (progress.phase !== 'packing' || progress.completed === progress.total || now - previous > 100) { previous = now; onProgress?.(progress); }
    });
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

  public async restore(backup: DatabaseBackup, onProgress?: (progress: RestoreProgress) => void): Promise<void> { await this.store.restore(backup, onProgress); }
}
