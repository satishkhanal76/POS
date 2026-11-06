import { BackupProgress } from "./progress";
import { Zip, ZipDeflate, strToU8, strFromU8, unzip } from "fflate";
import DatabaseBackupStore, {
  DatabaseBackup,
  validateBackup,
} from "../database/DatabaseBackup";
import { getLocaleText } from "../localization/locale";

interface ArchiveManifest {
  format: "pos-database-archive";
  formatVersion: 1;
  databaseVersion: number;
  sourceDatabase: string;
  createdAt: string;
  tables: Record<string, { file: string; count: number }[]>;
}

/** ZIP transport is separate from database snapshots and record/schema validation. */
export async function createBackupArchive(
  store: DatabaseBackupStore,
  onProgress?: (progress: BackupProgress) => void,
) {
  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) zipError = error;
    else chunks.push(chunk);
  });
  const tables: ArchiveManifest["tables"] = {};
  const addFile = (name: string, content: string) => {
    if (zipError) throw zipError;
    const entry = new ZipDeflate(name, { level: 6 });
    zip.add(entry);
    entry.push(strToU8(content), true);
    if (zipError) throw zipError;
  };
  try {
    const metadata = await store.exportParts((table, part, json, count) => {
      const file = `tables/${table}/part-${String(part).padStart(6, "0")}.json`;
      (tables[table] ??= []).push({ file, count });
      addFile(file, json);
    }, onProgress);
    const total = Object.values(tables)
      .flat()
      .reduce((sum, part) => sum + part.count, 0);
    onProgress?.({ completed: total, total, phase: "finalizing" });
    const manifest: ArchiveManifest = {
      format: "pos-database-archive",
      formatVersion: 1,
      ...metadata,
      tables,
    };
    addFile("manifest.json", JSON.stringify(manifest, null, 2));
    zip.end();
    if (zipError) throw zipError;
    return { blob: new Blob(chunks, { type: "application/zip" }), ...metadata };
  } catch (error) {
    zip.terminate();
    throw error;
  }
}

export async function readBackupArchive(file: File): Promise<DatabaseBackup> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const files = await new Promise<Record<string, Uint8Array>>(
      (resolve, reject) => {
        unzip(bytes, (error, result) =>
          error ? reject(error) : resolve(result),
        );
      },
    );
    if (!files["manifest.json"]) throw new Error();
    const manifest = JSON.parse(
      strFromU8(files["manifest.json"]),
    ) as ArchiveManifest;
    if (
      !manifest ||
      manifest.format !== "pos-database-archive" ||
      manifest.formatVersion !== 1 ||
      !manifest.tables ||
      typeof manifest.tables !== "object" ||
      Array.isArray(manifest.tables)
    )
      throw new Error();
    const tables: DatabaseBackup["tables"] = {};
    const expected = new Set(["manifest.json"]);
    for (const [table, parts] of Object.entries(manifest.tables)) {
      if (!/^[A-Z_]+$/.test(table) || !Array.isArray(parts) || !parts.length)
        throw new Error();
      const rows: DatabaseBackup["tables"][string] = [];
      for (const [index, part] of parts.entries()) {
        const path = `tables/${table}/part-${String(index + 1).padStart(6, "0")}.json`;
        if (
          !part ||
          part.file !== path ||
          !Number.isSafeInteger(part.count) ||
          part.count < 0 ||
          !files[path]
        )
          throw new Error();
        expected.add(path);
        const records: unknown = JSON.parse(strFromU8(files[path]));
        if (!Array.isArray(records) || records.length !== part.count)
          throw new Error();
        for (const row of records) rows.push(row);
        // Release each decoded byte buffer instead of retaining both forms of the whole database.
        delete files[path];
      }
      tables[table] = rows;
    }
    if (Object.keys(files).some((path) => !expected.has(path)))
      throw new Error();
    return validateBackup({
      ...manifest,
      format: "pos-database-backup",
      tables,
    });
  } catch {
    throw new Error(getLocaleText("BACKUP_ARCHIVE_INVALID"));
  }
}
