import DiscountItem, { DiscountItemParams } from "../models/DiscountItem";
import { IDB } from "./Database";
import ObjectStore, { IObjectStore } from "./ObjectStore";

export interface IDiscountOS
  extends IObjectStore<DiscountSchema, DiscountItem> {}

// this is what will be stored on database
export interface DiscountSchema extends DiscountItemParams {}

export default class DiscountOS
  extends ObjectStore<DiscountSchema, DiscountItem>
  implements IDiscountOS
{
  private static OBJECT_STORE_NAME = "DISCOUNTS";

  constructor(db: IDB) {
    super(db, DiscountOS.OBJECT_STORE_NAME);
  }

  public onObjectStoreCreation(objectStore: IDBObjectStore, db: IDB) {
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("name", "name", { unique: false });
  }

  public getObjectAsSchema(item: DiscountItem) {
    return {
      id: item.getId(),
      name: item.getName(),
      amount: item.getAmount(),
      discountType: item.getDiscountType(),
    } as DiscountSchema;
  }

  public getSchemaAsObject(schema: DiscountSchema): Promise<DiscountItem> {
    return new Promise((resolve, reject) => {
      resolve(new DiscountItem(schema));
    });
  }
}
