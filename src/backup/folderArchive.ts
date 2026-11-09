import { readBackupArchive } from "./BackupArchive";
import {
  BackupRow,
  DatabaseBackup,
  validateBackup,
} from "../database/DatabaseBackup";
import { getLocaleText } from "../localization/locale";
import { BackupDirectory } from "./folderAccess";

export const baselineFile = "pos-baseline.zip";
const changePattern = /^pos-change-(\d{8})\.json$/;

interface Changes {
  format: "pos-folder-changes";
  formatVersion: 1;
  baseline: string;
  previous: string;
  sequence: number;
  createdAt: string;
  tables: Record<string, { upserts: BackupRow[]; removed: string[] }>;
}

function invalid(): never {
  throw new Error(getLocaleText("FOLDER_BACKUP_INVALID"));
}

export async function folderBackupFiles(directory: BackupDirectory) {
  const files = new Map<string, File>();
  for await (const entry of directory.values()) {
    if (
      entry.kind === "file" &&
      (entry.name === baselineFile || changePattern.test(entry.name))
    ) {
      files.set(entry.name, await (entry as FileSystemFileHandle).getFile());
    }
  }
  return files;
}

export async function readFolderArchive(files: ReadonlyMap<string, File>) {
  const file = files.get(baselineFile);
  if (!file?.size) return invalid();
  const initial = await readBackupArchive(file);
  const tables = Object.fromEntries(
    Object.entries(initial.tables).map(([name, rows]) => [
      name,
      new Map(rows.map((row) => [String(row.id), row])),
    ]),
  );
  let sequence = 0;
  let createdAt = initial.createdAt;
  const names = [...files.keys()]
    .filter((name) => changePattern.test(name))
    .sort();
  for (const [index, name] of names.entries()) {
    const part = files.get(name)!;
    if (name !== changeFile(sequence + 1)) return invalid();
    // Creating a handle may leave an empty file if the app closes before the write commits.
    if (part.size === 0 && index === names.length - 1) break;
    let delta: Changes;
    try {
      delta = JSON.parse(await part.text()) as Changes;
    } catch {
      return invalid();
    }
    if (
      !delta ||
      delta.format !== "pos-folder-changes" ||
      delta.formatVersion !== 1 ||
      delta.baseline !== initial.createdAt ||
      delta.previous !== createdAt ||
      delta.sequence !== sequence + 1 ||
      typeof delta.createdAt !== "string" ||
      !Number.isFinite(Date.parse(delta.createdAt)) ||
      !delta.tables ||
      typeof delta.tables !== "object" ||
      Array.isArray(delta.tables)
    )
      return invalid();
    for (const [name, changes] of Object.entries(delta.tables)) {
      if (
        !Object.prototype.hasOwnProperty.call(tables, name) ||
        !changes ||
        !Array.isArray(changes.removed) ||
        !Array.isArray(changes.upserts)
      )
        return invalid();
      for (const id of changes.removed) {
        if (typeof id !== "string" || !tables[name].delete(id))
          return invalid();
      }
      for (const row of changes.upserts) {
        if (!row || typeof row.id !== "string") return invalid();
        tables[name].set(row.id, row);
      }
    }
    createdAt = delta.createdAt;
    sequence++;
  }
  return {
    baseline: initial.createdAt,
    sequence,
    backup: validateBackup({
      ...initial,
      createdAt,
      tables: Object.fromEntries(
        Object.entries(tables).map(([name, rows]) => [
          name,
          [...rows.values()],
        ]),
      ),
    }),
  };
}

export function changeFile(sequence: number) {
  return `pos-change-${String(sequence).padStart(8, "0")}.json`;
}

export function diffBackup(
  previous: Awaited<ReturnType<typeof readFolderArchive>>,
  current: DatabaseBackup,
): Changes {
  const tables: Changes["tables"] = {};
  for (const [name, rows] of Object.entries(current.tables)) {
    const remaining = new Map(
      previous.backup.tables[name].map((row) => [row.id, row]),
    );
    const upserts: BackupRow[] = [];
    for (const row of rows) {
      const old = remaining.get(row.id);
      if (
        !old ||
        Object.keys(old).length !== Object.keys(row).length ||
        Object.keys(row).some((key) => old[key] !== row[key])
      )
        upserts.push(row);
      remaining.delete(row.id);
    }
    const removed = [...remaining.keys()].map(String);
    if (upserts.length || removed.length) tables[name] = { upserts, removed };
  }
  return {
    format: "pos-folder-changes",
    formatVersion: 1,
    baseline: previous.baseline,
    previous: previous.backup.createdAt,
    sequence: previous.sequence + 1,
    createdAt: current.createdAt,
    tables,
  };
}

export async function writeBackupFile(
  directory: BackupDirectory,
  name: string,
  data: Blob | string,
) {
  const handle = await directory.getFileHandle(name, { create: true });
  const stream = await handle.createWritable();
  try {
    await stream.write(data);
    await stream.close();
  } catch (error) {
    await stream.abort().catch(() => {});
    throw error;
  }
}
