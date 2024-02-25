import { IDB, IObjectStoreDB } from "./Database";

export enum ObjectRequestErrorsTypes {
  EMPTY_RESPONSE,
  OTHER,
}

export interface ObjectRequestError {
  type: ObjectRequestErrorsTypes;
  defaultMessage?: string;
  payload?: Object;
}

/**
 * G (Generic) is a database schema
 */
export interface IObjectStore<G, I> {
  getAll: (id?: string) => Promise<I[]>;

  getOne: (id: string) => Promise<I>;

  deleteOne: (id: string) => Promise<I>;

  /**
   *  Gte the object store name
   * @returns the object store name (equivalent to a table in a database)
   */
  getObjectStoreName: () => string;

  getObjectAsSchema: (object: I) => G;
  getSchemaAsObject: (schema: G) => Promise<I>;

  addOne: (model: I) => Promise<I>;

  addMany: (models: I[]) => Promise<I[]>;

  getDb: () => Promise<IDB>;

  getAllByIndexName: (indexName: string, id?: string) => Promise<I[]>;
  geOneByIndexName: (indexName: string, id: string) => Promise<I>;

  getAllAsJSONString: () => Promise<string>;

  addManyFromJSON: (json: string) => Promise<I[]>;
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

  public async addManyFromJSON(json: string) {
    try {
      const schemas: G[] = JSON.parse(json.toString());

      const models = await Promise.all(
        schemas.map((schema) => this.getSchemaAsObject(schema))
      );
      return await this.addMany(models);
    } catch (err) {
      throw new Error("Item can't be parsed and/or added!");
    }
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

  public getAll(id?: string): Promise<I[]> {
    return new Promise(async (resolve, reject) => {
      const objectStore = await this.getReadOnlyObjectStore();
      const request = objectStore?.getAll(id);
      request?.addEventListener("success", async () =>
        resolve(
          await Promise.all(
            request.result.map((result) => this.getSchemaAsObject(result))
          )
        )
      );
      request?.addEventListener("error", () => reject(request));
    });
  }

  public getOne(id: string): Promise<I> {
    return new Promise(async (resolve, reject) => {
      const objectStore = await this.getReadOnlyObjectStore();

      const request = objectStore?.index("id").get(id);

      request?.addEventListener("success", () => {
        if (request.result) resolve(this.getSchemaAsObject(request.result));

        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.EMPTY_RESPONSE,
          defaultMessage: `Record with the id of ${id} on ${this.objectStoreName} was not found!`,
        };
        reject(error);
        return;
      });
      request?.addEventListener("error", (err) => {
        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.OTHER,
          payload: err,
        };
        reject(error);
      });
    });
  }

  public deleteOne(id: string): Promise<I> {
    return new Promise(async (resolve, reject) => {
      let data: Promise<I>;
      try {
        data = this.getOne(id);
      } catch (err) {
        reject(err);
      }

      const objectStore = await this.getReadWriteObjectStore();
      const request = objectStore?.delete(id);
      request?.addEventListener("success", () => resolve(data));
      request?.addEventListener("error", (err) => {
        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.OTHER,
          payload: err,
        };
        reject(error);
      });
    });
  }

  public async getAllByIndexName(indexName: string, id?: string): Promise<I[]> {
    return new Promise(async (resolve, reject) => {
      const indexStore = (await this.getReadOnlyObjectStore()).index(indexName);
      const request = id ? indexStore.getAll(id) : indexStore.getAll();

      request.onsuccess = async () => {
        // console.log(request.result);
        const settledPromise = await Promise.allSettled(
          request.result.map((result) => this.getSchemaAsObject(result))
        );

        const fulfilledResponses = settledPromise.filter(
          (p) => p.status === "fulfilled"
        ) as PromiseFulfilledResult<I>[];

        const rejectedResponses = settledPromise.filter(
          (p) => p.status === "rejected"
        );

        if (rejectedResponses.length >= 1) {
          console.error(rejectedResponses);
        }

        resolve(fulfilledResponses.map((p) => p.value));
      };

      request.onerror = (err) => {
        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.OTHER,
          payload: err,
        };
        reject(error);
      };
    });
  }

  public async geOneByIndexName(indexName: string, id: string): Promise<I> {
    return new Promise(async (resolve, reject) => {
      const indexStore = (await this.getReadOnlyObjectStore()).index(indexName);
      const request = indexStore.get(id);

      request.onsuccess = () => {
        resolve(this.getSchemaAsObject(request.result));
      };
      request.onerror = (err) => {
        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.OTHER,
          payload: err,
        };
        reject(error);
      };
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
        const error: ObjectRequestError = {
          type: ObjectRequestErrorsTypes.OTHER,
          payload: err,
        };
        reject(error);
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

  public async getSchemaAsObject(schema: G): Promise<I> {
    return new Promise((resolve, reject) => {
      reject("Unemplemented");
      throw new Error("Unimplemented");
    });
  }
  public async getAllAsJSONString(): Promise<string> {
    const items = await this.getAll();
    const itemsObjectArray = items.map((item) => this.getObjectAsSchema(item));
    return JSON.stringify(itemsObjectArray, null, 2);
  }
}
