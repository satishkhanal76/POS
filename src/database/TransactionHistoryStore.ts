import { TransactionContact } from "../models/TransactionListEntry";
import readContactMembershipPage from "./listing/readContactMembershipPage";
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
  /** Resolve assignments for visible rows; preserve archived contact names in history. */
  async getContacts(ids: string[]) {
    const db = await this.database.getDatabase();
    if (!ids.length) return new Map<string, TransactionContact[]>();
    return new Promise<Map<string, TransactionContact[]>>((resolve, reject) => {
      const transaction = db.transaction([
        "CUSTOMERS_TRANSACTIONS",
        "CUSTOMER",
      ]);
      const result = new Map<string, TransactionContact[]>();
      const contacts = new Map<
        string,
        Promise<TransactionContact | undefined>
      >();
      const tasks = ids.map(
        (id) =>
          new Promise<void>((done, fail) => {
            const request = transaction
              .objectStore("CUSTOMERS_TRANSACTIONS")
              .index("transactionId")
              .getAll(id);
            request.onerror = () => fail(request.error);
            request.onsuccess = () => {
              const linkedIds = [
                ...new Set(
                  (
                    request.result as {
                      customerId: string;
                      deletedAt?: number;
                    }[]
                  )
                    .filter((link) => !link.deletedAt)
                    .map((link) => link.customerId),
                ),
              ];
              const reads = linkedIds.map((contactId) => {
                let read = contacts.get(contactId);
                if (!read) {
                  read = new Promise((accept, rejectRead) => {
                    const contact = transaction
                      .objectStore("CUSTOMER")
                      .get(contactId);
                    contact.onerror = () => rejectRead(contact.error);
                    contact.onsuccess = () =>
                      accept(
                        contact.result
                          ? {
                              id: contactId,
                              name: contact.result.name,
                              deletedAt: contact.result.deletedAt,
                            }
                          : undefined,
                      );
                  });
                  contacts.set(contactId, read);
                }
                return read;
              });
              void Promise.all(reads).then((rows) => {
                result.set(
                  id,
                  rows.filter((row): row is NonNullable<typeof row> => !!row),
                );
                done();
              }, fail);
            };
          }),
      );
      transaction.onabort = () => reject(transaction.error);
      void Promise.all(tasks).then(() => resolve(result), reject);
    });
  }
  async getPage(
    options: PageOptions,
    range: DashboardRange,
    kind?: TransactionKindFilter,
    customerId?: string,
    membership?: "linked" | "unlinked",
  ): Promise<PageResult<TransactionsSchema>> {
    const db = await this.database.getDatabase();
    if (
      !membership &&
      !kind &&
      !customerId &&
      (options.sort === "newest" || options.sort === "oldest")
    )
      return readDatePage(db, options, range);
    await ensureListings(db, ["TRANSACTIONS"]);
    if (membership && !customerId)
      return readContactMembershipPage(
        db,
        options,
        range,
        membership === "linked",
        kind,
      );
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
