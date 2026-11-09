import { getLocaleText } from "../localization/locale";
import { CustomerSummarySchema } from "../models/CustomerTransactionSummary";
import type { CustomerTransactionsSchema } from "./CustomersTransactionsOS";
import { indexedHeader, indexedSummary } from "./listing/metadata";

export const customerLinkStores = [
  "CUSTOMERS_TRANSACTIONS",
  "CUSTOMER_TRANSACTION_SUMMARIES",
  "CUSTOMER",
];

// Queue these requests on the caller's write transaction so a sale, its
// inventory changes, and its customer balance can commit or roll back together.
export function queueCustomerLink(
  transaction: IDBTransaction,
  link: CustomerTransactionsSchema,
  abort: (message: string) => void,
) {
  const links = transaction.objectStore("CUSTOMERS_TRANSACTIONS");
  const existing = links.index("transactionId").getAll(link.transactionId);
  existing.onsuccess = () => {
    if (
      (existing.result as CustomerTransactionsSchema[]).some(
        (row) => !row.deletedAt,
      )
    ) {
      abort(getLocaleText("TRANSACTION_ALREADY_LINKED"));
      return;
    }
    const customer = transaction.objectStore("CUSTOMER").get(link.customerId);
    customer.onsuccess = () => {
      if (!customer.result || customer.result.deletedAt) {
        abort(getLocaleText("PAGINATION_CUSTOMER_MISSING"));
        return;
      }
      const sales = transaction.objectStore("TRANSACTIONS");
      const sale = sales.get(link.transactionId);
      sale.onsuccess = () => {
        if (!sale.result || sale.result.deletedAt) {
          abort(getLocaleText("PAGINATION_TRANSACTION_MISSING"));
          return;
        }
        sales.put(
          indexedHeader(sale.result, sale.result.kind ?? "sale", [
            link.customerId,
          ]),
        );
        links.add(link);
        const summaries = transaction.objectStore(
          "CUSTOMER_TRANSACTION_SUMMARIES",
        );
        const previous = summaries.get(link.customerId);
        previous.onsuccess = () => {
          const summary: CustomerSummarySchema = previous.result || {
            id: link.customerId,
            count: 0,
            total: 0,
            timestamp: 0,
          };
          summaries.put(
            indexedSummary(
              {
                id: summary.id,
                count: summary.count + 1,
                total: summary.total + sale.result.total,
                timestamp: Math.max(summary.timestamp, link.timestamp),
              },
              customer.result.deletedAt,
            ),
          );
        };
      };
    };
  };
}
