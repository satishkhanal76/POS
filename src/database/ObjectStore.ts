import { isDeleted } from '../deletion/state';
import DeletionStore from './DeletionStore';
import { requestValue } from './Pagination';
import { getLocaleText } from '../contexts/Locale';
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
  getAll: (id?: string, includeDeleted?: boolean) => Promise<I[]>;

  getOne: (id: string, includeDeleted?: boolean) => Promise<I>;

  deleteOne: (id: string, hard?: boolean) => Promise<I>;

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

  getAllByIndexName: (indexName: string, id?: string, includeDeleted?: boolean) => Promise<I[]>;
  geOneByIndexName: (indexName: string, id: string, includeDeleted?: boolean) => Promise<I>;

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
      throw new Error(getLocaleText('UI_ITEM_IMPORT_FAILED'));
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

  public async getAll(id?: string, includeDeleted = false): Promise<I[]> {
    const store = await this.getReadOnlyObjectStore();
    const rows = await requestValue(store.getAll(id));
    return Promise.all(rows.filter(row => includeDeleted || !isDeleted(row)).map(row => this.getSchemaAsObject(row)));
  }

  public async getOne(id: string, includeDeleted = false): Promise<I> {
    const store = await this.getReadOnlyObjectStore();
    const row = await requestValue(store.get(id));
    if (!row || (!includeDeleted && isDeleted(row))) throw { type: ObjectRequestErrorsTypes.EMPTY_RESPONSE, defaultMessage: getLocaleText('UI_RECORD_WITH_THE_ID_OF_VALUE_ON_VALUE_WAS', { value0: id, value1: this.objectStoreName }) };
    return this.getSchemaAsObject(row);
  }

  public async deleteOne(id: string, hard = false): Promise<I> {
    const model = await this.getOne(id, true);
    await new DeletionStore(this.db).delete(this.objectStoreName, id, hard);
    return model;
  }

  public async getAllByIndexName(indexName: string, id?: string, includeDeleted = false): Promise<I[]> {
    const index = (await this.getReadOnlyObjectStore()).index(indexName);
    const rows = await requestValue(id ? index.getAll(id) : index.getAll());
    return Promise.all(rows.filter(row => includeDeleted || !isDeleted(row)).map(row => this.getSchemaAsObject(row)));
  }

  public async geOneByIndexName(indexName: string, id: string, includeDeleted = false): Promise<I> {
    const index = (await this.getReadOnlyObjectStore()).index(indexName);
    const rows = await requestValue(index.getAll(id));
    const row = rows.find(record => includeDeleted || !isDeleted(record));
    if (!row) throw { type: ObjectRequestErrorsTypes.EMPTY_RESPONSE };
    return this.getSchemaAsObject(row);
  }

  public getObjectStoreName() {
    return this.objectStoreName;
  }

  public getObjectSoreParams() {
    return this.objectStoreParams;
  }

  public getObjectAsSchema(object: I) {
    console.trace(object);
    throw new Error(getLocaleText('UI_NOT_IMPLEMENTED'));
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
      throw new Error(getLocaleText('UI_UNIMPLEMENTED'));
    });
  }
  public async getAllAsJSONString(): Promise<string> {
    const items = await this.getAll();
    const itemsObjectArray = items.map((item) => this.getObjectAsSchema(item));
    return JSON.stringify(itemsObjectArray, null, 2);
  }
}
