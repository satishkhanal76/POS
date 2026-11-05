import { getLocaleText } from '../contexts/Locale';
//Database Interface
export interface IDB {
  /**
   *
   * @param name name of the object store
   * @param paramas the params of the object store
   * @param callback callback function to call when the object store is created
   * @returns
   */
  addObjectStore: (objectStore: IObjectStoreDB) => void;

  getDatabase: () => Promise<IDBDatabase>;

  connectDB: () => void;
}

/**
 * Datase Object Store
 * Any Object Store that need to be created at "upgradeneeded" event must extend this interface and be passed in to the IDB
 */
export interface IObjectStoreDB {
  getObjectStoreName: () => string;
  getObjectSoreParams: () => IDBObjectStoreParameters;

  /**
   * A Callaback Function to be ran anytime an object store is created
   * @param objectStore the created object store
   * @param database database that was just created
   * @returns void
   */
  onObjectStoreCreation?: (objectStore: IDBObjectStore, db: IDB) => void;

  onDatabaseConnection?: (db: IDB) => void;

  onDatabaseError?: (db: IDB) => void;
}

export default class DB implements IDB {
  private static DB_NAME = "POS";
  private static DB_VERSION = 2;

  private objectStoresMap: Map<string, IObjectStoreDB>;

  private db: IDBDatabase | undefined;

  private connection: Promise<IDBDatabase> | undefined;

  constructor(private readonly name = DB.DB_NAME) {
    this.objectStoresMap = new Map();
  }

  public async connectDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const dbRequest = window.indexedDB.open(this.name, DB.DB_VERSION);
      console.log("Connecting to database.");
      dbRequest.addEventListener("success", () => {
        this.onSuccess(dbRequest.result);
        resolve(dbRequest.result);
      });
      dbRequest.addEventListener("upgradeneeded", () => {
        // Add new stores in-place; existing stores and records are preserved.
        this.onUpgradeNeeded(dbRequest.result);
      });
      dbRequest.addEventListener("blocked", () => {
        console.warn("Close other POS tabs to finish updating the database.");
      });

      dbRequest.addEventListener("error", (eve) => {
        this.onError(eve);
        reject(dbRequest.error || new Error(getLocaleText('UI_DATABASE_CONNECTION_FAILED')));
      });
    });
  }

  /**
   * Runs this function when a databse already exists and had a successfull connection
   * (Will not run when a datase is created or updgraded)
   * @param database the database
   */
  private onSuccess(database: IDBDatabase) {
    database.onversionchange = () => {
      database.close();
      this.db = undefined;
      this.connection = undefined;
    };
    for (const entry of this.objectStoresMap.entries()) {
      const objectStoreDB: IObjectStoreDB = entry[1];

      if (objectStoreDB.onDatabaseConnection) {
        objectStoreDB.onDatabaseConnection(this);
      }
      // this.objectStoresMap.set(name, { ...objectStoreMap, objectStore });
    }
    // console.log(database);
  }
  /**
   * Runs this function when there is an error trying to retrieve a database
   * @param eve the event
   */
  private onError(eve: Event) {
    console.log(eve);
  }

  /**
   * Runs this function when a database is created or upgraded
   * I.e. all of the Table or Object Store creation or deletion need to happen here.
   * @param database the databse
   */
  private onUpgradeNeeded(database: IDBDatabase) {
    console.info(
      "Creating database object stores."
    );

    //create all object store
    for (const entry of this.objectStoresMap.entries()) {
      const objectStoreDB: IObjectStoreDB = entry[1];
      if (database.objectStoreNames.contains(objectStoreDB.getObjectStoreName())) continue;
      const objectStore = database.createObjectStore(
        objectStoreDB.getObjectStoreName(),
        objectStoreDB.getObjectSoreParams()
      );
      if (objectStoreDB.onObjectStoreCreation) {
        objectStoreDB.onObjectStoreCreation(objectStore, this);
      }
      // this.objectStoresMap.set(name, { ...objectStoreMap, objectStore });
    }
  }

  /**
   * Function that lets you add Object Store to be created while "upgradeneeded" transaction/event on the database occurs
   * @param name name of the Object Store(Table) to be created
   * @param params the parameters of the Object Store
   * @param callback this callback function runs immediatly after the Object Store was created
   */
  public addObjectStore(objectStore: IObjectStoreDB) {
    if (this.db)
      throw new Error(
        getLocaleText('UI_DATABASE_IS_ALREADY_CREATED_BEFORE_ADDING_ALL_OBJECT_STORES')
      );

    this.objectStoresMap.set(objectStore.getObjectStoreName(), objectStore);
  }

  public async getDatabase() {
    if (this.db) return this.db;
    if (!this.connection) {
      this.connection = this.connectDB().then(database => {
        this.db = database;
        return database;
      }).catch(error => {
        this.connection = undefined;
        throw error;
      });
    }
    return this.connection;
  }
}
