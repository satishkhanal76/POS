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
  private static DB_VERSION = 1;

  private objectStoresMap: Map<string, IObjectStoreDB>;

  private db: IDBDatabase | undefined;

  constructor() {
    this.objectStoresMap = new Map();
  }

  public async connectDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const dbRequest = window.indexedDB.open(DB.DB_NAME, DB.DB_VERSION);
      console.log("Conneting to database.");
      dbRequest.addEventListener("success", () => {
        this.onSuccess(dbRequest.result);
        resolve(dbRequest.result);
      });
      dbRequest.addEventListener(
        "upgradeneeded",
        async (eve: IDBVersionChangeEvent) => {
          await this.deletePreviousDatabase(eve);
          this.onUpgradeNeeded(dbRequest.result);
          const idbRequest: IDBOpenDBRequest = eve.target as IDBOpenDBRequest;
          const transaction: IDBTransaction =
            idbRequest.transaction as IDBTransaction;
          transaction.addEventListener("complete", () => {
            resolve(dbRequest.result);
          });
        }
      );

      dbRequest.addEventListener("error", (eve) => {
        this.onError(eve);
        reject(dbRequest.result);
        throw new Error("Database connection failed!");
      });
    });
  }

  private deletePreviousDatabase(eve: IDBVersionChangeEvent) {
    return new Promise((resolve, reject) => {
      const prevVersion = eve.oldVersion,
        newVersion = eve.newVersion;
      if (newVersion && prevVersion && newVersion > prevVersion) {
        const deltedatabase: boolean = confirm(
          `New version of the database is available. 
          Do you want to upgrade the database? 
          This will delete all data in the database. Talk to the admin if not sure.`
        );
        if (!deltedatabase) {
          alert(
            "Database was not deleted. Talk to the admin to correctly update the database."
          );
          resolve("User Denied");
          return;
        }
        const databaseDeletionReq = window.indexedDB.deleteDatabase(DB.DB_NAME);
        databaseDeletionReq.onsuccess = (eve) => {
          resolve("success");
        };
      }
      resolve("success");
    });
  }

  /**
   * Runs this function when a databse already exists and had a successfull connection
   * (Will not run when a datase is created or updgraded)
   * @param database the database
   */
  private onSuccess(database: IDBDatabase) {
    console.log("Success");
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
      "Creating Object Stores in the database. Any IDB.addObjectStore() after this point will throw an error."
    );

    //create all object store
    for (const entry of this.objectStoresMap.entries()) {
      const objectStoreDB: IObjectStoreDB = entry[1];
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
        "Database is already created before adding all object stores. (getDatase() was called before adding this object store.)"
      );

    this.objectStoresMap.set(objectStore.getObjectStoreName(), objectStore);
  }

  public async getDatabase() {
    if (typeof this.db === "undefined") {
      return (this.db = await this.connectDB());
    }

    return this.db;
  }
}
