import { markListingsReady } from "./listing/maintenance";
import { IDB } from "./Database";
import { getLocaleText } from "../localization/locale";

/** Empty every store in the active database atomically, retaining the valid schema. */
export default class DatabaseResetStore {
  constructor(private readonly database: IDB) {}
  async getName() {
    return (await this.database.getDatabase()).name;
  }
  async clear(confirmedName: string) {
    const db = await this.database.getDatabase();
    if (confirmedName !== db.name)
      throw new Error(getLocaleText("RESET_NAME_MISMATCH"));
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        Array.from(db.objectStoreNames),
        "readwrite",
      );
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(new Error(getLocaleText("RESET_FAILED")));
      try {
        for (const name of Array.from(db.objectStoreNames))
          transaction.objectStore(name).clear();
      } catch {
        transaction.abort();
      }
    });
    markListingsReady(db);
  }
}
