import { IDB } from "./Database";

/**
 * G (Generic) is a database schema
 */
export interface IObjectStore<G> {
  getAll: () => Promise<G[]>;

  getOne: (id: string) => Promise<G>;

  deleteOne: (id: string) => Promise<G>;
}

/**
 * the generic S denotes the schema (the interface of the database schema)
 */
export default class ObjectStore<G> implements IObjectStore<G> {
  protected db: IDB;
  protected objectStoreName: string;

  constructor(db: IDB, objecStoreName: string) {
    this.db = db;
    this.objectStoreName = objecStoreName;
  }

  protected async getReadOnlyTransaction() {
    const db = await this.db.getDatabase();
    return db?.transaction(this.objectStoreName, "readonly");
  }

  protected async getReadWriteTransaction() {
    const db = await this.db.getDatabase();
    return db?.transaction(this.objectStoreName, "readwrite");
  }

  protected async getReadOnlyObjectStore() {
    const transaction = await this.getReadOnlyTransaction();
    return transaction?.objectStore(this.objectStoreName);
  }

  protected async getReadWriteObjectStore() {
    const transaction = await this.getReadWriteTransaction();
    return transaction?.objectStore(this.objectStoreName);
  }

  public getAll(): Promise<G[]> {
    return new Promise(async (resolve, reject) => {
      const objectStore = await this.getReadOnlyObjectStore();
      const request = objectStore?.getAll();
      request?.addEventListener("success", () => resolve(request.result));
      request?.addEventListener("error", () => reject(request));
    });
  }

  public getOne(id: string): Promise<G> {
    return new Promise(async (resolve, reject) => {
      const objectStore = await this.getReadOnlyObjectStore();
      const request = objectStore?.index("id").get(id);
      request?.addEventListener("success", () => resolve(request.result));
      request?.addEventListener("error", () => reject(request));
    });
  }

  public deleteOne(id: string): Promise<G> {
    return new Promise(async (resolve, reject) => {
      let data: Promise<G>;
      try {
        data = this.getOne(id);
      } catch (err) {
        reject(err);
      }

      const objectStore = await this.getReadWriteObjectStore();
      const request = objectStore?.delete(id);
      request?.addEventListener("success", () => resolve(data));
      request?.addEventListener("error", () => reject(request));
    });
  }
}
