import { IDB } from "./Database";
import CustomerActivityStore from "./CustomerActivityStore";
export type BalanceFilter = "owing" | "settled" | "credit" | "all";
export interface CustomerBalance {
  id: string;
  name: string;
  phoneNumber: string;
  balance: number;
  timestamp: number;
  deletedAt?: number;
}
export interface BalanceOptions {
  filter: BalanceFilter;
  search: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
}
export default class CustomerBalancesOS {
  constructor(private readonly database: IDB) {}
  async getPage(options: BalanceOptions) {
    const customers = await new CustomerActivityStore(this.database).list(
      options.includeDeleted,
    );
    const search = options.search.trim().toLocaleLowerCase();
    let outstanding = 0,
      credit = 0,
      owingCount = 0;
    const matches: CustomerBalance[] = [];
    for (const customer of customers) {
      const balance = Math.abs(customer.total) < 0.0000001 ? 0 : customer.total;
      if (balance > 0) {
        outstanding += balance;
        owingCount++;
      }
      if (balance < 0) credit -= balance;
      const included =
        options.filter === "all" ||
        (options.filter === "owing" && balance > 0) ||
        (options.filter === "credit" && balance < 0) ||
        (options.filter === "settled" && balance === 0);
      if (
        included &&
        `${customer.name} ${customer.phoneNumber}`
          .toLocaleLowerCase()
          .includes(search)
      )
        matches.push({ ...customer, balance });
    }
    matches.sort((a, b) =>
      options.filter === "credit"
        ? a.balance - b.balance || a.name.localeCompare(b.name)
        : b.balance - a.balance || a.name.localeCompare(b.name),
    );
    const pageSize = [0, 10, 25, 50, 100].includes(options.pageSize)
      ? options.pageSize
      : 10;
    const size = pageSize || Math.max(1, matches.length);
    const page =
      pageSize === 0
        ? 1
        : Math.max(
            1,
            Math.min(
              options.page,
              Math.max(1, Math.ceil(matches.length / size)),
            ),
          );
    return {
      rows: matches.slice((page - 1) * size, page * size),
      total: matches.length,
      page,
      pageSize,
      outstanding,
      credit,
      owingCount,
    };
  }
}
