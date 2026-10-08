# Architecture

The POS application is organized into several layers that separate presentation, application logic, domain objects, and persistence.

The central design is:

```text
┌──────────────────────────┐
│       React UI           │
│ components / pages       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Controllers         │
│ application operations   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Domain Models       │
│ Transaction / Customer   │
│ Product / Discount       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Object Stores       │
│ persistence + conversion │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        IndexedDB         │
└──────────────────────────┘
```

This is not a strict implementation of a formal architectural pattern; it is a practical separation of responsibilities developed around the application's needs.

## Components and Pages

The React component layer contains the application's presentation and interaction logic.

Major areas include:

- POS transaction interface
- Products/items management
- Customer management
- Transaction history
- Customer transaction history
- Settings
- Search and selection modals
- Reusable table and button components

Pages provide higher-level application views, while components implement reusable portions of those views.

The POS interface is built from smaller transaction components rather than representing the entire transaction workflow in a single UI component.

## Domain Models

The model layer represents the concepts the application operates on.

Important models include:

- `Transaction`
- `TransactionItem`
- `ProductItem`
- `ProductTransactionItem`
- `DiscountItem`
- `DiscountTransactionItem`
- `Customer`
- `CustomerTransaction`
- `Transactions`
- `CustomerTransactions`

The `Transaction` model contains much of the domain behavior surrounding a transaction. It manages transaction items, quantities, totals, discounts, timestamps, identifiers, and posted state.

This allows the application to manipulate a transaction as a domain object instead of treating it as an arbitrary collection of React state.

## Controllers

Controllers provide the application-facing interface to persistence.

The generic `Controller<Schema, I, OS>` class delegates common operations to an associated object store:

- get one
- get all
- add one
- add many
- delete one

Specialized controllers extend this behavior where the application requires domain-specific operations.

For example, `TransactionController` provides operations such as:

- creating a new transaction
- posting a transaction
- retrieving a transaction by ID
- retrieving transactions ordered by timestamp
- retrieving the latest transaction
- exporting transaction data as JSON

This creates a useful boundary between the UI and the database implementation.

The UI does not need to know how IndexedDB requests are constructed in order to retrieve or persist a transaction.

## Database Layer

The database layer is the most distinctive part of the architecture.

Instead of allowing React components or controllers to interact directly with IndexedDB, the project introduces a reusable `ObjectStore` abstraction.

```text
Controller
     │
     ▼
ObjectStore<Model Schema, Domain Model>
     │
     ▼
IndexedDB Object Store
```

Each concrete object store specifies:

1. The database schema.
2. The corresponding domain model.
3. The IndexedDB object-store name.
4. Any required indexes.
5. Conversion between database schemas and domain objects.
6. Domain-specific queries.

This allows the rest of the application to work with typed models while the persistence layer deals with IndexedDB's lower-level API.

See [Database Architecture](database.md) for the detailed design.

## Relationships Between Data

Transactions are not persisted as one large serialized object.

Instead, related information is stored separately.

For example:

```text
TRANSACTIONS
     │
     ├────────── TRANSACTION_PRODUCTS
     │                 │
     │                 └──── PRODUCTS
     │
     └────────── TRANSACTION_DISCOUNTS
                       │
                       └──── DISCOUNTS
```

Customer relationships are also represented separately:

```text
CUSTOMER
   │
   └──── CUSTOMERS_TRANSACTIONS ──── TRANSACTIONS
```

When domain objects are reconstructed, the relevant object stores retrieve the associated records and rebuild the richer model.

This allows database records to remain relatively compact while the application continues to work with expressive domain objects.

## React Contexts

Several application-wide concerns are provided through React context.

### Database Context

`DatabaseContext` provides access to the application's database-related objects and controllers.

This keeps database dependencies available to the component tree without requiring every component to construct its own database connection or controller.

### Client Global Context

`ClientGlobalContext` stores client-wide configuration such as:

- Currency character
- Number of decimal places

These values are persisted through `localStorage`.

The context also listens for updates through both a custom browser event and the browser's `storage` event, allowing client configuration to stay synchronized.

### Locale Context

`LocaleContext` provides localized UI text to components through React context.

The project separates language data from the components themselves and provides a small interpolation utility for strings containing values such as `${...}`.

## Data Flow

A typical transaction operation follows approximately this path:

```text
User interaction
      │
      ▼
React component
      │
      ▼
Controller
      │
      ▼
Domain model
      │
      ▼
ObjectStore
      │
      ▼
IndexedDB transaction
      │
      ▼
Persisted schema
```

Reading data reverses the process:

```text
IndexedDB
    │
    ▼
Stored schema
    │
    ▼
ObjectStore
    │
    ▼
Domain model reconstruction
    │
    ▼
Controller
    │
    ▼
React component
```

This separation is especially useful for complex objects such as transactions, where reconstructing the model may require querying multiple object stores.

## Progressive Web App

The application is built with Vite and configured with `vite-plugin-pwa`.

The PWA plugin is registered with automatic update behavior, allowing the browser application to be installed and updated as a Progressive Web App.

The Vite configuration also uses an environment-provided base URL, allowing the application's deployment path to be configured without hardcoding it into the application.

## Design Goals

The architecture reflects several practical goals:

### Keep the UI independent of persistence

React components should interact with application-level objects and controllers rather than raw IndexedDB requests.

### Keep domain behavior in models

Operations that conceptually belong to a transaction are represented by the `Transaction` model rather than being scattered throughout unrelated components.

### Make persistence reusable

The generic object-store layer provides a common persistence interface while allowing each database entity to define its own schema conversion and indexes.

### Keep the application client-side

The core POS workflow can operate without a backend service because persistent application data is stored locally in the browser.

### Preserve strong typing

TypeScript interfaces and generic classes connect database schemas, domain models, controllers, and UI-facing operations.