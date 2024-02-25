import { v4 as uuidv4 } from "uuid";
import { ITransactionItem } from "./TransactionItem";
import ProductItem from "./ProductItem";
import ProductTransactionItem, {
  IProductTransactionItem,
  ProductTransactionItemParams,
} from "./ProductTransactionItem";
import DiscountTransactionItem, {
  DiscountTransactionItemParams,
  IDiscountTransactionItem,
} from "./DiscountTransactionItem";
import DiscountItem, { DiscountItemType, IDiscountItem } from "./DiscountItem";
import FloatValidator from "../validators/FloatValidator";

export interface ITransaction {
  getTimestamp: () => number;
  getId: () => string;
  getTotal: () => number;

  getAllTransactionItems: () =>
    | IProductTransactionItem[]
    | IDiscountTransactionItem[];

  /**
   * Finds and returns the transaction item that matches the id provided.
   * @param id the id of the item
   * @returns transaction item or undefinded if none found
   */
  getTransactionItem: (
    id: string
  ) => IProductTransactionItem | IDiscountTransactionItem | undefined;

  doesTransactionItemExist: (id: string) => boolean;

  getLastTransactionItem: () =>
    | IProductTransactionItem
    | IDiscountTransactionItem
    | null;

  /**
   *
   * @returns if the transaction has any items in it
   */
  hasItems: () => boolean;

  /**
   * Decrements the quantity of an item from the transaction
   * @param id the item id
   * @returns the decremented item
   */
  decrementTransactionItem: (
    id: string
  ) => IProductTransactionItem | IDiscountTransactionItem | null;

  removeTransactionItem: (
    id: string
  ) => IProductTransactionItem | IDiscountTransactionItem | null;

  changeTransactionItemQuantity: (id: string, quantity: number) => void;

  setIsPosted: (isPosted: boolean) => void;

  /**
   *  Checks if the transaction is posted to the database
   * @returns if the transaction is posted
   */
  isPosted: () => boolean;

  addDiscountItem: (item: DiscountItem) => IDiscountTransactionItem;

  getAllTransactionDiscountItems: () => IDiscountTransactionItem[];

  getTransactionDiscountItem: (id: string) => IDiscountTransactionItem | null;

  addProductItem: (item: ProductItem) => IProductTransactionItem;
  getAllTransactionProductItems: () => IProductTransactionItem[];

  getTransactionProductItem: (id: string) => IProductTransactionItem | null;

  addTransactionDiscountItem: (item: DiscountTransactionItem) => void;
  addTransactionProductItem: (item: ProductTransactionItem) => void;

  getLast: () => IProductTransactionItem | IDiscountTransactionItem | null;
}

export default class Transaction implements ITransaction {
  private timestamp: number;
  private id: string;
  private transactionProductItems: ProductTransactionItem[];
  private transactionDiscountItems: DiscountTransactionItem[];

  private total: number;
  private hasBeenPosted: boolean;

  constructor(id?: string, timestamp?: number) {
    this.id = id || uuidv4();
    this.timestamp = timestamp || Date.now();
    this.transactionProductItems = [];
    this.transactionDiscountItems = [];

    this.total = 0;
    this.hasBeenPosted = false;
  }

  public addTransactionDiscountItem(item: DiscountTransactionItem): void {
    this.transactionDiscountItems.push(item);
    this.calculateTotal();
  }
  public addTransactionProductItem(item: ProductTransactionItem): void {
    this.transactionProductItems.push(item);
    this.calculateTotal();
  }

  public addDiscountItem(item: DiscountItem): IDiscountTransactionItem {
    const transactionDiscountItem: DiscountTransactionItem =
      new DiscountTransactionItem({
        id: this.id,
        isQuantityChangable: false,
        item,
      } as DiscountTransactionItemParams);
    this.addTransactionDiscountItem(transactionDiscountItem);
    return transactionDiscountItem;
  }

  public addProductItem(item: ProductItem): IProductTransactionItem {
    let productTransItem = this.getTransactionProductItem(item.getId());
    if (productTransItem) {
      this.changeTransactionItemQuantity(
        item.getId(),
        productTransItem.getQuantity() + 1
      );
      return productTransItem;
    }
    const transactionProductItem: ProductTransactionItem =
      new ProductTransactionItem({
        id: this.id,
        item,
      } as ProductTransactionItemParams);
    this.addTransactionProductItem(transactionProductItem);
    return transactionProductItem;
  }

  public getAllTransactionDiscountItems(): DiscountTransactionItem[] {
    return this.transactionDiscountItems;
  }

  public getTransactionDiscountItem(
    id: string
  ): IDiscountTransactionItem | null {
    return (
      this.transactionDiscountItems.find(
        (item) => item.getItem().getId() === id
      ) || null
    );
  }

  public getAllTransactionProductItems(): ProductTransactionItem[] {
    return this.transactionProductItems;
  }

  public getTransactionProductItem(id: string): IProductTransactionItem | null {
    return (
      this.transactionProductItems.find(
        (item) => item.getItem().getId() === id
      ) || null
    );
  }
  public getAllTransactionItems() {
    return [...this.transactionProductItems, ...this.transactionDiscountItems];
  }

  private calculateTotal() {
    const productTotal = this.transactionProductItems.reduce(
      (accumulation: number, transactionProduct) =>
        accumulation + transactionProduct.getAmount(),
      0
    );

    const discountTotal = this.transactionDiscountItems.reduce(
      (accumulation: number, transactionDiscount) => {
        if (
          transactionDiscount.getItem().getDiscountType() ===
          DiscountItemType.PERCENTAGE
        ) {
          transactionDiscount.setDiscountAmount(
            (transactionDiscount.getItem().getAmount() / 100) * productTotal
          );
        }
        return accumulation + transactionDiscount.getAmount();
      },
      0
    );
    this.total = productTotal - discountTotal;
  }

  public getTimestamp() {
    return this.timestamp;
  }
  public getId() {
    return this.id;
  }

  public getTransactionItem(id: string) {
    return this.getAllTransactionItems().find(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
  }

  public getTotal() {
    this.calculateTotal();
    return this.total;
  }

  public decrementTransactionItem(id: string) {
    const transactionItem = this.getTransactionItem(id);
    if (!transactionItem) return null;

    this.changeTransactionItemQuantity(id, transactionItem.getQuantity() - 1);

    return transactionItem;
  }

  public getLastTransactionItem() {
    return this.getAllTransactionItems()[
      this.getAllTransactionItems().length - 1
    ];
  }

  public removeProductTransactionItem(
    id: string
  ): IProductTransactionItem | null {
    const productIndex = this.transactionProductItems.findIndex(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
    if (productIndex >= 0) {
      const removedItem = this.transactionProductItems.splice(
        productIndex,
        1
      )[0];
      this.calculateTotal();

      if (removedItem) return removedItem;
    }
    return null;
  }

  public removeDiscountTransactionItem(
    id: string
  ): IDiscountTransactionItem | null {
    const discountIndex = this.transactionDiscountItems.findIndex(
      (transactionItem) => transactionItem.getItem().getId() === id
    );
    if (discountIndex >= 0) {
      const removedItem = this.transactionDiscountItems.splice(
        discountIndex,
        1
      )[0];
      this.calculateTotal();

      if (removedItem) return removedItem;
    }
    return null;
  }

  public removeTransactionItem(id: string) {
    let removedItem = this.removeProductTransactionItem(id);
    if (!removedItem) this.removeDiscountTransactionItem(id);
    return removedItem;
  }

  public changeTransactionItemQuantity(id: string, quantity: number) {
    this.getAllTransactionItems()
      .find((t) => t.getItem().getId() === id)
      ?.setQuantity(quantity);

    this.calculateTotal();
  }

  public hasItems() {
    return this.getAllTransactionItems().length !== 0;
  }

  public setIsPosted(isPosted: boolean) {
    this.hasBeenPosted = isPosted;
  }

  public isPosted() {
    return this.hasBeenPosted;
  }

  public doesTransactionItemExist(id: string) {
    return (
      this.getAllTransactionItems().find(
        (transactionItem) => transactionItem.getItem().getId() === id
      ) !== undefined
    );
  }

  public getLast(): ITransactionItem<ProductItem | DiscountItem> {
    return this.transactionProductItems[
      this.transactionProductItems.length - 1
    ];
  }
}
