import ObjectStore from "../database/ObjectStore";

export interface IController<Schema, I, OS> {
  getObjectStore: () => OS;

  getOne: (id: string) => Promise<I>;

  getAll: () => Promise<I[]>;

  deleteOne: (id: string) => Promise<I>;

  addOne: (model: I) => Promise<I>;

  addMany: (models: I[]) => Promise<I[]>;
}

export default class Controller<Schema, I, OS extends ObjectStore<Schema, I>>
  implements IController<Schema, I, OS>
{
  protected objectStore: OS;

  constructor(objectStore: OS) {
    this.objectStore = objectStore;
  }

  public async getAll() {
    return await this.objectStore.getAll();
  }

  public async deleteOne(id: string) {
    return await this.objectStore.deleteOne(id);
  }

  public async getOne(id: string) {
    return await this.objectStore.getOne(id);
  }

  public getObjectStore() {
    return this.objectStore;
  }

  public addOne(model: I) {
    return this.objectStore.addOne(model);
  }

  public addMany(models: I[]) {
    return this.objectStore.addMany(models);
  }
}
