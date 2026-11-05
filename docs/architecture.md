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
## Extending Settings

The settings page is available from the main navigation at `/settings`.

- `src/data/ClientGlobal.json` defines defaults and the inferred `Settings` value type.
- `src/settings/settings.ts` defines the typed field registry, validation, draft conversion, and storage. Each key's control type must match its default value's type.
- `SettingsPage.tsx` renders fields from the registry. Text, numeric, and boolean switch controls include labels, descriptions, and inline validation. Changes remain drafts until Save; restoring defaults also requires Save.
- `ClientGlobalProvider` supplies saved values through `useClientGlobal()`. Price displays update immediately after saving; the provider also applies the saved appearance preference.

To add a setting, add its default to the JSON and a corresponding entry to `settingsSchema`, specifying a label, description, group, and constraints. The page renders the control automatically. Use `useClientGlobal()` in the consuming feature to implement the setting's behavior. To add another group, extend the field group type and the page's group list.

Storage retains the existing `pos.clientGlobal` key. Older saved configurations inherit new defaults. Invalid stored fields fall back individually to defaults, and unknown keys are ignored. Saves validate before writing, then notify the provider only when storage succeeds. Other tabs refresh through the browser storage event. An open settings form preserves its draft; Discard loads the latest saved values. Settings are local to this browser, rather than shared between devices.

## Navigation

`src/components/NavBar.tsx` composes the brand, POS shortcut, grouped navigation, and Settings shortcut. `src/data/navigation.ts` contains typed group and link definitions; add destinations there without changing the dropdown component. Labels resolve through LocaleContext with English fallbacks.

`src/components/Navigation/NavigationDropdown.tsx` owns disclosure state and interaction behavior. It renders ordinary navigation links, supports native Tab/Enter interaction, closes on Escape (returning focus to its trigger), outside clicks, focus leaving the group, and route changes. Active groups also account for related detail routes. `src/components/NavBar.css` owns presentation and the compact mobile layout. Navigation has no persistence or domain behavior, so it stays within the presentation layer rather than introducing a controller or model.

## Demo Workspace

Real data stays in `POS`; sample data and all practice activity stay in `POS_DEMO`. Both databases use the same schema, object stores, models, and existing feature controllers. Settings remain browser-wide.

- `database/Database.tsx` accepts an optional database name (default `POS`) and shares an in-flight connection promise to avoid duplicate connections during concurrent reads.
- `database/DatabaseStores.ts` is the composition factory for the database and its related object stores. DatabaseContext selects the real or demo instance at page load.
- `data/demoData.ts` contains editable product and customer fixtures.
- `controllers/WorkspaceController.ts` owns first-visit checks, mode selection, demo seeding, and reset operations. Fixtures pass through existing domain models and object-store schema converters. Clearing and optional seeding run in one IndexedDB transaction across every demo store, including transaction relationships, so a reset cannot leave partial data. This workspace-level operation intentionally coordinates multiple stores rather than being placed in an individual feature controller.
- `components/Workspace` contains the first-visit dialog, persistent demo banner, and Settings controls. Components call the workspace controller rather than accessing IndexedDB.

The first-visit offer appears only when no real records exist and no choice has been remembered. A localStorage flag remembers that choice. The selected workspace is stored in sessionStorage, so selecting demo affects the current tab and survives reloads. Demo records persist until explicitly cleared or restarted; they are shared by tabs using `POS_DEMO`. Clearing leaves an empty demo workspace; restarting replaces all demo activity with fresh fixtures. Returning to the real workspace preserves demo records. Switching or resetting reloads the app to discard cached controllers and unposted transactions. Real records are never copied, seeded, or cleared by demo operations.

## Database Backup and Restore

Settings provides a full-workspace JSON download and file-based restore. One versioned JSON envelope contains source database name, schema version, export timestamp, and an array for every table, including relationship tables. This single-file format requires no ZIP dependency and can be inspected directly. It covers the active database only; browser display settings and unposted in-memory transactions are excluded.

`components/Settings/BackupSettings.tsx` owns file selection, preview counts, explicit replacement confirmation, and the reload action. `controllers/BackupController.ts` coordinates file parsing, validation, download creation, and persistence calls. `database/DatabaseBackup.ts` is the persistence boundary: a single read transaction exports raw stored schemas, preserving original IDs rather than reconstructing models (some relationship converters generate fresh IDs). Restore validates table completeness, field types, finite numbers, IDs, unique timestamps, and foreign-key references, then clears and writes every table in one transaction. Any write failure aborts the entire replacement. Schema version 1 is supported; future schema changes must update the validator or introduce a migration before accepting newer backups.

Restore replaces the active workspace instead of merging, so records cannot collide or leave stale relationships. Source database metadata never selects the destination: real and demo remain explicitly controlled by the active DatabaseContext. The UI shows which workspace will be replaced and requires confirmation; users can download the existing workspace first. Reload after restore discards cached models/controllers and unposted transactions. Existing per-table JSON exports are not full backups and are not accepted by this restore flow.

## Shared Dialog Presentation

`FullScreenModal` is the shared dialog shell for add forms and searchable selectors. It uses the native dialog element through a portal, providing focus containment, Escape dismissal, a labeled close button, backdrop dismissal, scroll locking, and focus restoration. Its component API remains title/onClose/children; feature controllers and persistence are unchanged.

`SearchableModal` composes that shell and renders filtered, keyboard-operable selection buttons with result counts and empty states. Search results derive directly from the query and current items, avoiding duplicated result state. `CustomForm.css` owns shared form presentation; shell and search styles are scoped to their own classes and use the existing theme variables for light and dark appearances. Item selection uses the shared Price component for the saved currency and precision preferences.
