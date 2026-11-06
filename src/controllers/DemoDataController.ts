import { indexedHeader } from "../database/listing/metadata";
import { TransactionsSchema } from "../database/TransactionsOS";
import { CustomerTransactionsSchema } from "../database/CustomersTransactionsOS";
import { PurchaseSchema, SupplierPaymentSchema } from "../models/Purchase";
import { IDataBaseContext } from "../database/DatabaseStores";
import {
  demoCustomers,
  demoPriceChanges,
  demoProducts,
  demoSalePatterns,
  DEMO_SALE_COUNT,
} from "../data/demoData";
import Customer from "../models/Customer";
import ProductItem from "../models/ProductItem";
import ItemPriceChange from "../models/ItemPriceChange";
import DiscountItem, { DiscountItemType } from "../models/DiscountItem";
import Transaction from "../models/Transaction";
import ProductTransactionItem from "../models/ProductTransactionItem";
import CustomerTransaction from "../models/CustomerTransaction";
import CustomerTransactionSummary, {
  CustomerSummarySchema,
} from "../models/CustomerTransactionSummary";

const DAY = 24 * 60 * 60 * 1000;

/** Build a complete demo through domain models and existing schema converters. No writes. */
export default class DemoDataController {
  constructor(private readonly stores: IDataBaseContext) {}

  public build(now = Date.now()): Record<string, object[]> {
    const stores = this.stores;
    const records: Record<string, object[]> = {};
    records.PURCHASES = [];
    records.PURCHASE_LINES = [];
    records.SUPPLIER_PAYMENTS = [];
    records.STOCK = demoProducts.map((product) => ({
      id: product.id,
      count: 40,
    }));
    const products = demoProducts.map((product) => new ProductItem(product));
    const customers = demoCustomers.map((customer) => new Customer(customer));
    const demoContact = customers[0],
      otherContact = customers[1];
    records.PURCHASES = [
      {
        id: "demo-purchase-1",
        contactId: demoContact.getId(),
        contactName: demoContact.getName(),
        timestamp: now - 20 * DAY,
        reference: "SAMPLE-001",
        total: 22.5,
        stockApplied: 0,
      },
      {
        id: "demo-purchase-2",
        contactId: otherContact.getId(),
        contactName: otherContact.getName(),
        timestamp: now - 7 * DAY,
        reference: "SAMPLE-002",
        total: 19,
        stockApplied: 0,
      },
    ];
    records.PURCHASE_LINES = [
      {
        id: "demo-purchase-line-1",
        purchaseId: "demo-purchase-1",
        productId: products[0].getId(),
        name: products[0].getName(),
        quantity: 12.5,
        unitCost: 1.8,
        total: 22.5,
      },
      {
        id: "demo-purchase-line-2",
        purchaseId: "demo-purchase-2",
        productId: products[0].getId(),
        name: products[0].getName(),
        quantity: 10,
        unitCost: 1.9,
        total: 19,
      },
    ];
    records.SUPPLIER_PAYMENTS = [
      {
        id: "demo-supplier-payment-1",
        contactId: demoContact.getId(),
        contactName: demoContact.getName(),
        timestamp: now - 10 * DAY,
        reference: "SAMPLE-PAY-001",
        amount: 5,
      },
    ];
    const changes = demoPriceChanges
      .map(
        (change) =>
          new ItemPriceChange({
            id: change.id,
            itemId: change.itemId,
            amount: change.amount,
            timestamp: now - change.daysAgo * DAY,
          }),
      )
      .sort((a, b) => a.data.timestamp - b.data.timestamp);
    const discounts = {
      flat: new DiscountItem({
        id: "demo-discount-flat",
        name: "Sample flat discount",
        amount: 1,
        discountType: DiscountItemType.FLAT,
      }),
      percentage: new DiscountItem({
        id: "demo-discount-percentage",
        name: "Sample 10% discount",
        amount: 10,
        discountType: DiscountItemType.PERCENTAGE,
      }),
    };
    records[stores.itemOS.getObjectStoreName()] = products.map((product) =>
      stores.itemOS.getObjectAsSchema(product),
    );
    records[stores.customerOS.getObjectStoreName()] = customers.map(
      (customer) => stores.customerOS.getObjectAsSchema(customer),
    );
    records[stores.itemPriceChangesOS.getObjectStoreName()] = changes.map(
      (change) => stores.itemPriceChangesOS.getObjectAsSchema(change),
    );
    records[stores.discountOS.getObjectStoreName()] = Object.values(
      discounts,
    ).map((discount) => stores.discountOS.getObjectAsSchema(discount));
    const transactions: object[] = [];
    const productLines: object[] = [];
    const discountLines: object[] = [];
    const customerLinks: object[] = [];
    const summaries = new Map<string, CustomerSummarySchema>();

    for (let index = 0; index < DEMO_SALE_COUNT; index++) {
      const timestamp = now - ((DEMO_SALE_COUNT - index) * DAY) / 2;
      const transaction = new Transaction(`demo-sale-${index + 1}`, timestamp);
      const pattern = demoSalePatterns[index % demoSalePatterns.length];
      for (const line of pattern.products) {
        const product = products.find((item) => item.getId() === line.id)!;
        const amount = changes
          .filter(
            (change) =>
              change.data.itemId === line.id &&
              change.data.timestamp <= timestamp,
          )
          .reduce(
            (_previous, change) => change.data.amount,
            product.getOriginalAmount(),
          );
        const historicalProduct = new ProductItem(
          { id: product.getId(), name: product.getName(), amount },
          product.getOriginalAmount(),
        );
        transaction.addTransactionProductItem(
          new ProductTransactionItem({
            id: transaction.getId(),
            item: historicalProduct,
            quantity: line.quantity,
          }),
        );
      }
      if (pattern.discount)
        transaction.addDiscountItem(discounts[pattern.discount]);
      transaction.setIsPosted(true);
      transactions.push(stores.transactionsOS.getObjectAsSchema(transaction));
      productLines.push(
        ...transaction
          .getAllTransactionProductItems()
          .map((line) => stores.transactionItemsOS.getObjectAsSchema(line)),
      );
      discountLines.push(
        ...transaction
          .getAllTransactionDiscountItems()
          .map((line) => stores.transactionDiscountsOS.getObjectAsSchema(line)),
      );
      // Every fourth sale is a walk-in; all sample customers still get linked history.
      if (index % 4 !== 0) {
        const customer = customers[index % customers.length];
        const link = new CustomerTransaction({
          id: `demo-link-${index + 1}`,
          timestamp,
          customer,
          transaction,
        });
        customerLinks.push(
          stores.cutomersTransactionsOS.getObjectAsSchema(link),
        );
        const summary = summaries.get(customer.getId()) || {
          id: customer.getId(),
          timestamp: 0,
          count: 0,
          total: 0,
        };
        summary.count++;
        summary.total += transaction.getTotal();
        summary.timestamp = Math.max(summary.timestamp, timestamp);
        summaries.set(customer.getId(), summary);
      }
    }
    const linksByTransaction = new Map(
      (customerLinks as CustomerTransactionsSchema[]).map((link) => [
        link.transactionId,
        [link.customerId],
      ]),
    );
    records[stores.transactionsOS.getObjectStoreName()] = (
      transactions as TransactionsSchema[]
    ).map((row) =>
      indexedHeader(
        row,
        row.kind ?? "sale",
        linksByTransaction.get(row.id) ?? [],
        row.listItemCount ?? 0,
      ),
    );
    records.PURCHASES = (records.PURCHASES as PurchaseSchema[]).map((row) =>
      indexedHeader(row, "purchase"),
    );
    records.SUPPLIER_PAYMENTS = (
      records.SUPPLIER_PAYMENTS as SupplierPaymentSchema[]
    ).map((row) => indexedHeader(row, "supplier-payment"));
    records[stores.transactionItemsOS.getObjectStoreName()] = productLines;
    records[stores.transactionDiscountsOS.getObjectStoreName()] = discountLines;
    records[stores.cutomersTransactionsOS.getObjectStoreName()] = customerLinks;
    records[stores.customerSummariesOS.getObjectStoreName()] = Array.from(
      summaries.values(),
      (summary) =>
        stores.customerSummariesOS.getObjectAsSchema(
          new CustomerTransactionSummary(
            summary,
            customers.find((customer) => customer.getId() === summary.id)!,
          ),
        ),
    );
    return records;
  }
}
