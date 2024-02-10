interface IDBObjectStoreMap {
  params: IDBObjectStoreParameters;
  objectStore?: IDBObjectStore;
  callback?: (objectStore: IDBObjectStore | undefined) => void;
}

export interface IDB {
  /**
   *
   * @param name name of the object store
   * @param paramas the params of the object store
   * @param callback callback function to call when the object store is created
   * @returns
   */
  addObjectStore: (
    key: string,
    params: IDBObjectStoreParameters,
    callback?: (objectStore: IDBObjectStore) => void
  ) => void;

  getDatabase: () => Promise<IDBDatabase | undefined>;

  connectDB: () => void;
}

export default class DB implements IDB {
  private static DB_NAME = "POS";
  private static DB_VERSION = 1;

  private objectStoresMap: Map<string, IDBObjectStoreMap>;

  private db: IDBDatabase | undefined;

  constructor() {
    this.objectStoresMap = new Map();
  }

  public async connectDB() {
    return (this.db = await new Promise((resolve, reject) => {
      const dbRequest = window.indexedDB.open(DB.DB_NAME, DB.DB_VERSION);
      dbRequest.addEventListener("success", (eve) => {
        this.onSuccess(dbRequest.result);
        resolve(dbRequest.result);
      });
      dbRequest.addEventListener("upgradeneeded", (eve) => {
        this.onUpgradeNeeded(dbRequest.result);
        resolve(dbRequest.result);
      });
      dbRequest.addEventListener("error", (eve) => {
        this.onError(eve);
        reject(eve);
      });
    }));
  }

  private onSuccess(database: IDBDatabase) {}
  private onError(eve: Event) {}

  private onUpgradeNeeded(database: IDBDatabase) {
    //create all object store
    for (const entry of this.objectStoresMap.entries()) {
      const [name, objectStoreMap] = entry;
      const objectStore = database.createObjectStore(
        name,
        objectStoreMap.params
      );
      if (objectStoreMap?.callback) {
        objectStoreMap.callback(objectStore);
      }
      this.objectStoresMap.set(name, { ...objectStoreMap, objectStore });
    }
  }

  public addObjectStore(
    name: string,
    params: IDBObjectStoreParameters,
    callback?: (objectStore: IDBObjectStore) => void
  ) {
    this.objectStoresMap.set(name, {
      params,
      callback,
    } as IDBObjectStoreMap);
  }

  public async getDatabase() {
    if (typeof this.db === "undefined") {
      await this.connectDB();
    }

    return this.db;
  }
}
