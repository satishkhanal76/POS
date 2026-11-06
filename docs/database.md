# Database Architecture

The POS application's persistence layer is built directly on the browser's native **IndexedDB API**.

Rather than using a third-party IndexedDB wrapper, the project implements its own abstraction for connecting to IndexedDB, creating object stores, managing indexes, performing CRUD operations, and converting between database records and TypeScript domain models.

This is one of the core architectural pieces of the application.

## Why Build an Abstraction?

IndexedDB provides persistent structured storage in the browser, but its native API is relatively low-level.

The application has to deal with concepts such as:

- Database connections
- Database versioning
- `upgradeneeded`
- Object stores
- Indexes
- Read-only and read-write transactions
- Asynchronous requests
- Request events
- Schema conversion
- Relationship reconstruction

Instead of exposing those details throughout the application, POS concentrates them inside a reusable persistence layer.

The rest of the application can therefore operate on objects such as:

```text
ProductItem
Customer
Transaction
DiscountItem
```

while the database layer handles their IndexedDB representation.

## Core Abstraction

The central class is:

```text
ObjectStore<G, I>
```

where:

- `G` represents the database schema.
- `I` represents the application's domain object.

The abstraction exposes common operations including:

```text
getAll()
getOne()
deleteOne()
addOne()
addMany()
getAllByIndexName()
getOneByIndexName()
getAllAsJSONString()
addManyFromJSON()
```

It also defines the conversion boundary between schemas and models:

```text
Domain Model
     │
     │ getObjectAsSchema()
     ▼
Database Schema
     │
     │ IndexedDB
     ▼
Database Schema
     │
     │ getSchemaAsObject()
     ▼
Domain Model
```

Concrete object stores implement those conversion methods for their particular model.

## Database Connection

The `DB` class provides the application's IndexedDB connection.

The database is named:

```text
POS
```

and currently uses database version `1`.

Object stores are registered with the database before the actual database connection is created.

When IndexedDB triggers `upgradeneeded`, the database iterates through the registered object stores and creates them with their configured parameters.

This allows object-store classes to participate in database initialization without the central database class needing to know every store's schema.

## Object Store Registration

The database maintains a map of objects implementing the `IObjectStoreDB` interface.

Each registered store supplies information such as:

- Object-store name
- Object-store parameters
- Optional creation callback
- Optional connection callback
- Optional error callback

During database creation or upgrade, the database creates each object store and invokes its creation callback.

This gives concrete stores control over their own indexes.

## Schema Conversion

One of the most important parts of the abstraction is separating database schemas from domain objects.

For example, the product database schema contains:

```text
id
name
amount
```

while the application works with a `ProductItem` object.

`ProductOS` implements:

```text
getObjectAsSchema()
getSchemaAsObject()
```

to convert between those representations.

The same mechanism is used throughout the database layer.

This means the domain model does not need to be designed around IndexedDB's storage format.

## Database Object Stores

The application currently defines specialized object stores for several types of data.

### Products

`ProductOS` stores product records and provides indexes for:

- `id`
- `name`

The stored schema is intentionally small:

```text
Product
├── id
├── name
└── amount
```

### Customers

`CustomerOS` stores:

```text
Customer
├── id
├── name
└── phoneNumber
```

and indexes customers by ID and name.

### Transactions

`TransactionsOS` stores the primary transaction record:

```text
Transaction
├── id
├── timestamp
└── total
```

The transaction's individual products and discounts are stored separately.

When a transaction is reconstructed, `TransactionsOS` retrieves the associated product and discount records and adds them back to the `Transaction` model.

## Transaction Products

`TransactionProductsOS` stores the relationship between a transaction and a product.

Its schema is:

```text
TransactionProduct
├── id
├── transactionId
├── productId
└── quantity
```

Indexes are provided for:

- `id`
- `transactionId`
- `productId`

A transaction can therefore retrieve all of its product items using the `transactionId` index.

When a record is converted back into a domain object, the referenced product is retrieved from `ProductOS`.

## Transaction Discounts

`TransactionDiscountsOS` follows a similar pattern.

Its schema is:

```text
TransactionDiscount
├── id
├── transactionId
├── discountId
└── quantity
```

Indexes are provided for:

- `id`
- `transactionId`
- `discountId`

The referenced discount object is reconstructed through `DiscountOS`.

## Customer Transactions

Customer-to-transaction relationships are stored separately in `CustomersTransactionsOS`.

The schema contains:

```text
CustomerTransaction
├── timestamp
├── id
├── customerId
└── transactionId
```

This allows the application to efficiently retrieve transactions associated with a particular customer.

When reconstructing a `CustomerTransaction`, the store retrieves both the customer and transaction objects and combines them into the domain model.

## Reconstructing Rich Objects

A major consequence of this design is that database records are not necessarily equivalent to application models.

For example, the stored transaction record does not contain every product and discount inside the transaction.

Instead:

```text
TRANSACTIONS
      │
      │ transactionId
      ▼
TRANSACTION_PRODUCTS ──────► PRODUCTS
      │
      │ transactionId
      ▼
TRANSACTION_DISCOUNTS ─────► DISCOUNTS
```

`TransactionsOS.getSchemaAsObject()` reconstructs the transaction by:

1. Creating a `Transaction` from the stored transaction schema.
2. Querying transaction-product records.
3. Querying transaction-discount records.
4. Adding those objects to the transaction.
5. Returning the reconstructed domain model.

The result is that application code gets a complete `Transaction` object without needing to understand how its data is distributed across IndexedDB.

## Posting Transactions

Posting a transaction demonstrates the separation particularly well.

`TransactionsOS.postTransaction()` obtains:

- The transaction's product items.
- The transaction's discount items.

It persists those relationship records through their respective object stores and then persists the main transaction record.

Conceptually:

```text
Transaction
     │
     ├── Product items ──► TRANSACTION_PRODUCTS
     │                         │
     │                         └──► PRODUCTS
     │
     ├── Discount items ─► TRANSACTION_DISCOUNTS
     │                         │
     │                         └──► DISCOUNTS
     │
     └── Transaction ────► TRANSACTIONS
```

## Index-Based Queries

The generic object-store abstraction also provides index-based queries.

For example:

```text
getAllByIndexName("transactionId", id)
```

can be used by transaction relationship stores to retrieve all records belonging to a particular transaction.

This allows specialized stores to expose domain-specific operations such as:

```text
getAllByTransactionId()
getCustomerTransactions()
getAllTransactionsByTimestamp()
getLatestTransaction()
```

while still relying on the same generic IndexedDB implementation underneath.

## JSON Import and Export

The generic object-store layer also provides JSON serialization.

A store can export its models as JSON and import JSON back into models.

The flow is:

```text
Domain models
      │
      ▼
Database schemas
      │
      ▼
JSON
```

and in the opposite direction:

```text
JSON
  │
  ▼
Database schemas
  │
  ▼
Domain models
  │
  ▼
IndexedDB
```

This capability is useful for data portability and also demonstrates another benefit of keeping schema/model conversion centralized.

## Error Handling

The persistence abstraction defines typed categories for object-store request errors, including empty responses and other request failures.

Specialized stores can therefore distinguish between a missing record and a more general IndexedDB failure when reconstructing models.

## Tradeoffs

Building directly on IndexedDB provides a great deal of control, but it also means the project has to handle the complexity that a database library would normally abstract away.

The custom implementation therefore trades:

**More implementation complexity**

for:

**More control over the storage model and application architecture.**

That tradeoff was intentional in this project. The resulting abstraction gives the rest of the application a much cleaner interface to persistent browser storage without introducing an external IndexedDB library.

## Current Limitations

The database version is currently fixed at version `1`.

When a database upgrade is detected, the current implementation explicitly asks the user whether the existing database should be deleted before continuing with the new schema. This is a deliberately simple migration strategy rather than a general-purpose migration framework.

That approach is appropriate for the current application, but a production system with evolving schemas would likely need versioned migrations that preserve existing data.

## Summary

The database layer can be viewed as three distinct responsibilities:

```text
┌─────────────────────────────────────┐
│        Database Connection          │
│  DB / version / object-store setup  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│        Generic ObjectStore          │
│ CRUD / indexes / requests / JSON    │
│ schema ↔ model conversion boundary  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│      Specialized Object Stores      │
│ Products / Customers / Transactions │
│ Discounts / relationship records    │
└─────────────────────────────────────┘
```

The result is a native IndexedDB implementation that is hidden behind a strongly typed application-level interface.

That abstraction is arguably the most technically significant part of the POS project: instead of depending on a library to make IndexedDB easier to use, the project builds the layer needed to make IndexedDB fit the application's architecture.

## Stock (Version 4)

STOCK stores one current `{ id: productId, count }` record per product. Missing counts are zero. Manual counts are absolute nonnegative safe integers; advisory stock deductions can leave a negative count. No historical stock ledger is maintained. Master and adherence settings live in browser preferences, separately from database records. Sales update current stock atomically with their saved header and lines only while stock management is enabled. Payment transactions and later customer assignment have no inventory effect.

## Soft Deletion (Version 5)

PRODUCTS, CUSTOMER and TRANSACTIONS support an optional positive deletedAt timestamp; absent means active. Data remains physically present after ordinary deletion. Historical line reconstruction opts into deleted product reads and continues to use effective prices. Generic store reads exclude deleted records by default and accept explicit inclusion. Canonical customer summaries exclude deleted transactions; inclusive history views derive alternate summaries without changing canonical data. Hard deletion requires prior soft deletion and explicitly confirmed cascades, as described in architecture.md.

## Contacts and Purchasing (Version 6)

The CUSTOMER physical store now represents shared Contacts; IDs and existing sales links are retained. New stores: PURCHASES (id, contactId, contactName snapshot, timestamp, reference, total, stockApplied, optional deletedAt/stockReversed); PURCHASE_LINES (id, purchaseId, productId, name snapshot, quantity, unitCost, total); SUPPLIER_PAYMENTS (id, contactId, contactName snapshot, timestamp, reference, amount, optional deletedAt). Header stores index timestamp/contactId; lines index purchaseId/productId. One received purchase and its optional stock increase commit atomically. Receivables and payables are independent account projections. Quantities may have three decimal places.

### Version 7: repair incomplete schemas

Version 7 creates any missing registered stores in place, including purchasing stores on an incomplete version-6 database. Existing stores and records remain intact in both workspaces. Connections are checked for every registered store before use. Backup versions 1–7 are accepted and normalized to version 7 for restore.

### Version 8: editable purchase invoice numbers

Purchase drafts generate a `PUR-YYYYMMDD-XXXXXXXX` invoice number, editable in Invoice / Reference. Posting trims the value and generates one if blank. A non-unique reference index supports an atomic duplicate check and insert, preventing new duplicate invoice numbers even across tabs (including soft-deleted purchases). The index remains non-unique to preserve older records and backups that reused supplier references. Version 8 adds the index in place; versions 1–8 of backups remain supported. Permanent relationship IDs are unchanged. Purchase lists, detail pages, print reports, and deletion prompts display the invoice, with a stable short label for older purchases without a reference. A successful post or void generates a new number; a failed post retains the draft and its number.

Purchase invoice numbers are now read-only in the order UI. The purchase date remains editable. Pay Supplier on purchase details opens the shared supplier payment form with the contact, invoice reference, and full purchase total prefilled; those payment fields remain editable. Payments continue to reduce the selected supplier’s account balance and are not allocated to individual invoices.

### Version 9: mandatory unique purchase invoices

Upgrade preserves distinct invoice numbers, trims surrounding spaces, and assigns generated invoices to legacy blanks or repeated references, including soft-deleted purchases. The reference index is now unique. New purchase commands generate a number if omitted. Current backups must contain distinct non-empty trimmed purchase invoices; older backups are normalized before restore. Supplier payment references remain editable and may repeat because several payments can reference one invoice.

### Version 10: indexed date pagination

Transactions add a sparse deletedTimestamp index on [timestamp, deletedAt]. Unfiltered newest/oldest history uses index counts for exact live totals and traverses timestamp keys, reading only the requested page’s headers. Later pages skip keys without reading skipped headers. Deleted rows are checked through the sparse index; date boundaries remain start-inclusive/end-exclusive. The index is maintained automatically by soft/hard deletion and restore, without changing record fields. Type/customer filters and amount/item sorts retain their filtering/sorting paths. Backups through version 10 remain supported.

### Version 13: indexed listing projections

Version 13 adds derived multi-entry date/amount/item-count indexes for transactions, purchases, supplier payments and customer summaries, a normalized catalog search index, an active-link key index, and price-history date keys. Each key carries scope and deletion visibility, plus compact values needed for ordering and balance projections. Header item counts include product and discount lines, matching the existing transaction list. Active customer IDs come from active links, preserving original transaction timestamps when a customer is linked later.

All-time queries use index counts plus key cursors, skipping earlier pages without reading their records. Ranged amount/item rankings scan only keys in that date range, keep the needed ordered prefix and hydrate the final page. Purchasing merges purchase/payment keys before fetching values. Search counts inspect name/phone keys; catalog records and current prices are loaded only for the selected page. Price history derives each visible row’s previous price from the preceding event, including events outside the displayed page.

Updates keep keys consistent with canonical records. Upgrade backfills existing data without clearing stores; restore regenerates projections from validated canonical rows in existing bounded write batches. Exports strip projection fields to keep archives portable and avoid duplicating internal indexes. Backups from versions 1–13 are supported. Earlier development versions 11–12 are also rebuilt during upgrade.

Customer balance lists inspect summary/catalog keys because their headline totals span the whole workspace. Historical inclusion additionally inspects transaction amount and active-link keys, without loading whole transaction records. Dashboard aggregates likewise still process the full selected period, but read minimal header keys, reuse product/price lookups, and bound pending record requests.

### Version 14: non-blocking, resumable preparation

The version-13 JavaScript backfill held the entire database upgrade open while rebuilding every transaction. On the five-year stress dataset this prevented even Items and Contacts from opening. Version 14 limits the blocking upgrade to schema/index definitions (retaining the older essential invoice/summary migrations for their original schema versions). Existing records are not cleared.

The ordinary newest/oldest transaction page now uses the original timestamp index immediately, with index counts and the existing sparse deletedTimestamp index for exact totals and visibility. It reads only the selected headers, and counts product/discount lines only for those selected legacy headers. No transaction preparation is required for this path.

Complex queries call ensureListings before creating their read transaction. Each requested table is prepared independently in 100-record write batches; locks are released and the UI yields between batches. Completed checkpoints store generation, last primary key, and completed count per workspace/table in localStorage. Interrupted work resumes safely; no canonical prices, stock, links or totals are changed by preparation. New writes and restored/demo records already carry current-generation keys. Unknown legacy sale item counts remain unprepared until they are actually counted, including after linking/unlinking/deletion.

Backup export and ordinary catalog pages remain available during history preparation. Successful restore/reset/demo replacement marks its normalized tables ready. Development hot reload retains running jobs and progress; blocked upgrades display an actionable message instead of only logging a warning. Preparation failures leave completed batches/checkpoints intact and retain original records. Downloaded backups omit internal keys and generation markers; backup versions 1–14 are accepted.
