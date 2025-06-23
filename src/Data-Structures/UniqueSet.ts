
export interface IComparable {
  getId(): string;
}

export default class CustomSet<T extends IComparable> {
    private items: Map<string | number, T>;
  
    constructor(iterable?: Iterable<T>) {
      this.items = new Map();
  
      if (iterable) {
        for (const item of iterable) {
          this.add(item);
        }
      }
    }
  
    add(item: T): this {
      this.items.set(item.getId(), item);
      return this;
    }
  
    delete(item: T): boolean {
      return this.items.delete(item.getId());
    }
  
    has(item: T): boolean {
      return this.items.has(item.getId());
    }

    get(id: string): T | null {
      return this.items.get(id) || null;
    }

    remove(id: string): T | null {
      const item = this.get(id);
      if(item){
        this.delete(item);
        return item;
      } 
      return null;
    }
  
    clear(): void {
      this.items.clear();
    }
  
    get size(): number {
      return this.items.size;
    }
  
    values(): IterableIterator<T> {
      return this.items.values();
    }
  
    toArray(): T[] {
      return Array.from(this.items.values());
    }
  
    [Symbol.iterator](): IterableIterator<T> {
      return this.values();
    }
  }