import { IDB } from "../database/Database";
import DatabaseResetStore from "../database/DatabaseResetStore";

export default class DatabaseResetController {
  private readonly store: DatabaseResetStore;
  constructor(database: IDB) {
    this.store = new DatabaseResetStore(database);
  }
  getName() {
    return this.store.getName();
  }
  clear(confirmedName: string) {
    return this.store.clear(confirmedName);
  }
}
