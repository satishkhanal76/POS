import { IDB, IObjectStoreDB } from "./Database";

/**
 * G (Generic) is a database schema
 */
export interface IObjectStore<G, I> {
  getAll: () => Promise<G[]>;

  getOne: (id: string) => Promise<G>;

  deleteOne: (id: string) => Promise<G>;

  /**
   *  Gte the object store name
   * @returns the object store name (equivalent to a table in a database)
   */
  getObjectStoreName: () => string;

  getObjectAsSchema: (object: I) => G;

  addOne: (model: I) => Promise<I>;

  addMany: (models: I[]) => Promise<I[]>;

  getDb: () => Promise<IDB>;
}

/**
 * the generic G denotes the schema (the interface of the database schema)
 * the generic I denotes an object item (the model of the S)
 */
export default class ObjectStore<G, I>
  implements IObjectStore<G, I>, IObjectStoreDB
{
  protected db: IDB;
  protected objectStoreName: string;
  protected objectStoreParams: IDBObjectStoreParameters;

  constructor(
    db: IDB,
    objecStoreName: string,
    objectStoreParams?: IDBObjectStoreParameters
  ) {
    this.db = db;
    this.objectStoreName = objecStoreName;
    this.objectStoreParams = objectStoreParams || {
      keyPath: "id",
    };

    this.addObjectStoreToDB();
  }

  private addObjectStoreToDB() {
    this.db.addObjectStore(this);
  }

  protected async createReadOnlyTransaction() {
    const db = await this.db.getDatabase();
    return db?.transaction(this.objectStoreName, "readonly");
  }

  protected async createReadWriteTransaction() {
    const db = await this.db.getDatabase();
    return db?.transaction(this.objectStoreName, "readwrite");
  }

  protected async getReadOnlyObjectStore() {
    const transaction = await this.createReadOnlyTransaction();
    return transaction?.objectStore(this.objectStoreName);
  }

  protected async getReadWriteObjectStore() {
    const transaction = await this.createReadWriteTransaction();
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

  public getObjectStoreName() {
    return this.objectStoreName;
  }

  public getObjectSoreParams() {
    return this.objectStoreParams;
  }

  public getObjectAsSchema(object: I) {
    console.trace(object);
    throw new Error("Not Implemented!");
    return {} as G;
  }

  public async addOne(model: I): Promise<I> {
    return new Promise(async (resolve, reject) => {
      const objectStore = await this.getReadWriteObjectStore();

      objectStore.transaction.oncomplete = () => {
        resolve(model);
      };
      objectStore.transaction.onerror = (err) => {
        reject(err);
      };

      objectStore.add(this.getObjectAsSchema(model));
    });
  }

  public async addMany(models: I[]): Promise<I[]> {
    return await Promise.all(models.map((m) => this.addOne(m)));
  }

  public async getDb() {
    return this.db;
  }
}
