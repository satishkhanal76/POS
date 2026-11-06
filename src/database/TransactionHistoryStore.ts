import { ensureListings } from "./listing/maintenance";
import readDatePage from "./listing/readDatePage";
import { contactScope, kindScope } from "./listing/metadata";
import { IDB } from "./Database";
import { PageOptions, PageResult } from "./Pagination";
import { TransactionsSchema } from "./TransactionsOS";
import { DashboardRange } from "../dashboard/period";
import readListingPage from "./listing/readPage";

export type TransactionKindFilter = "sale" | "payment";
/** Query precomputed indexes; hydrate only the selected headers. */
export default class TransactionHistoryStore {
  constructor(private readonly database: IDB) {}
  async getPage(
    options: PageOptions,
    range: DashboardRange,
    kind?: TransactionKindFilter,
    customerId?: string,
  ): Promise<PageResult<TransactionsSchema>> {
    const db = await this.database.getDatabase();
    if (!kind && !customerId && (options.sort === 'newest' || options.sort === 'oldest')) return readDatePage(db, options, range);
    await ensureListings(db, ['TRANSACTIONS']);
    const scope = customerId
      ? contactScope(customerId, kind)
      : kind
        ? kindScope(kind)
        : "all";
    return readListingPage(
      [db.transaction("TRANSACTIONS").objectStore("TRANSACTIONS")],
      options,
      range,
      scope,
    );
  }
}
