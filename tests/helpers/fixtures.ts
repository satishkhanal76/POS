import { createDatabaseStores, IDataBaseContext } from '../../src/database/DatabaseStores';
import ProductItem from '../../src/models/ProductItem';
import Customer from '../../src/models/Customer';
import Transaction from '../../src/models/Transaction';
import CustomerTransaction from '../../src/models/CustomerTransaction';
import { requestResult, transactionDone } from './environment';

export async function catalog(name = 'test') {
  const stores = createDatabaseStores(name);
  const product = new ProductItem({ id: 'product', name: 'Coffee', amount: 5 });
  const customer = new Customer({ id: 'customer', name: 'Alex', phoneNumber: '555-0101' });
  await stores.itemOS.addOne(product);
  await stores.customerOS.addOne(customer);
  return { stores, product, customer };
}

export async function sale(stores: IDataBaseContext, product: ProductItem, id: string, timestamp: number, customer?: Customer) {
  const transaction = new Transaction(id, timestamp);
  transaction.addProductItem(product);
  await stores.transactionsOS.postTransaction(transaction);
  if (customer) await stores.cutomersTransactionsOS.addOne(new CustomerTransaction({
    id: `link-${id}`, timestamp, customer, transaction,
  }));
  return transaction;
}

export async function historyFixture() {
  const { stores, product } = await catalog();
  const customers = Array.from({ length: 12 }, (_, index) => new Customer({ id: `c${index}`, name: `Customer ${index}`, phoneNumber: '' }));
  await stores.customerOS.addMany(customers);
  for (let index = 0; index < 35; index++) await sale(stores, product, `t${index}`, 1000 + index, customers[index % 12]);
  return { stores, product, customers };
}

/** Real pre-upgrade schemas: a v1 original sale, or v2 price history and another sale. */
export async function legacyDatabase(version: 1 | 2, name = 'legacy') {
  const tables: Record<string, { indexes: Record<string, string | string[]>; rows: object[] }> = {
    PRODUCTS: { indexes: { id: 'id', name: 'name' }, rows: [{ id: 'p', name: 'Coffee', amount: 3 }] },
    CUSTOMER: { indexes: { id: 'id', name: 'name' }, rows: [{ id: 'c', name: 'Alex', phoneNumber: '' }] },
    DISCOUNTS: { indexes: { id: 'id', name: 'name' }, rows: [] },
    TRANSACTIONS: { indexes: { id: 'id', timestamp: 'timestamp' }, rows: [{ id: 'old', timestamp: 1000, total: 6 }] },
    TRANSACTION_PRODUCTS: { indexes: { id: 'id', transactionId: 'transactionId', productId: 'productId' }, rows: [{ id: 'line-old', transactionId: 'old', productId: 'p', quantity: 2 }] },
    TRANSACTION_DISCOUNTS: { indexes: { id: 'id', transactionId: 'transactionId', discountId: 'discountId' }, rows: [] },
    CUSTOMERS_TRANSACTIONS: { indexes: { id: 'id', timestamp: 'timestamp', customerId: 'customerId', transactionId: 'transactionId' }, rows: [{ id: 'link-old', customerId: 'c', transactionId: 'old', timestamp: 1010 }] },
  };
  if (version === 2) {
    tables.ITEM_PRICE_CHANGES = { indexes: { id: 'id', itemTimestamp: ['itemId', 'timestamp'] }, rows: [{ id: 'change', itemId: 'p', amount: 5, timestamp: 2000 }] };
    tables.TRANSACTIONS.rows.push({ id: 'new', timestamp: 3000, total: 10 });
    tables.TRANSACTION_PRODUCTS.rows.push({ id: 'line-new', transactionId: 'new', productId: 'p', quantity: 2 });
    tables.CUSTOMERS_TRANSACTIONS.rows.push({ id: 'link-new', customerId: 'c', transactionId: 'new', timestamp: 3010 });
  }
  const request = indexedDB.open(name, version);
  request.onupgradeneeded = () => {
    for (const [table, definition] of Object.entries(tables)) {
      const store = request.result.createObjectStore(table, { keyPath: 'id' });
      for (const [index, key] of Object.entries(definition.indexes)) store.createIndex(index, key, { unique: index === 'id' || index === 'timestamp' || index === 'itemTimestamp' });
      for (const row of definition.rows) store.add(row);
    }
  };
  const database = await requestResult(request);
  database.close();
  return createDatabaseStores(name);
}

export async function putRaw(stores: IDataBaseContext, table: string, record: object) {
  const database = await stores.database.getDatabase();
  const transaction = database.transaction(table, 'readwrite');
  transaction.objectStore(table).put(record);
  await transactionDone(transaction);
}
