import { requestValue } from "../database/Pagination";

type AccessMode = "read" | "readwrite";
export interface BackupDirectory extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: AccessMode }): Promise<PermissionState>;
  requestPermission(options: { mode: AccessMode }): Promise<PermissionState>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}
const browser = () =>
  window as Window & {
    showDirectoryPicker?: (options: {
      mode: AccessMode;
    }) => Promise<BackupDirectory>;
  };

export function folderBackupSupported() {
  return (
    typeof browser().showDirectoryPicker === "function" && !!navigator.locks
  );
}

export function chooseBackupFolder(mode: AccessMode) {
  return browser().showDirectoryPicker!({ mode });
}

export const backupIntervals = [1, 6, 24] as const;
export type BackupInterval = (typeof backupIntervals)[number];
export interface FolderBackupSettings {
  directory: BackupDirectory;
  enabled: boolean;
  baseline: string;
  interval: BackupInterval;
  checkedAt: number;
  savedAt: string;
}

async function preferenceStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const open = indexedDB.open("POS_FOLDER_BACKUP_SETTINGS", 1);
  open.onupgradeneeded = () => open.result.createObjectStore("workspaces");
  const db = await requestValue(open);
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("workspaces", mode);
      const request = action(transaction.objectStore("workspaces"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export function readFolderSettings(workspace: string) {
  return preferenceStore<FolderBackupSettings | undefined>(
    "readonly",
    (store) => store.get(workspace),
  );
}
export function saveFolderSettings(
  workspace: string,
  value: FolderBackupSettings,
) {
  return preferenceStore("readwrite", (store) => store.put(value, workspace));
}
