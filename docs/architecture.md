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

`components/Settings/BackupSettings.tsx` owns file selection, preview counts, explicit replacement confirmation, and the reload action. `controllers/BackupController.ts` coordinates file parsing, validation, download creation, and persistence calls. `database/DatabaseBackup.ts` is the persistence boundary: a single read transaction exports raw stored schemas, preserving original IDs rather than reconstructing models (some relationship converters generate fresh IDs). Restore validates table completeness, field types, finite numbers, IDs, unique timestamps, and foreign-key references, then clears and writes every table in one transaction. Any write failure aborts the entire replacement. Schema versions 1, 2, and 3 are supported. Older backups inherit the missing price-history table and derived customer summaries; future schema changes must update validation and migrations.

Restore replaces the active workspace instead of merging, so records cannot collide or leave stale relationships. Source database metadata never selects the destination: real and demo remain explicitly controlled by the active DatabaseContext. The UI shows which workspace will be replaced and requires confirmation; users can download the existing workspace first. Reload after restore discards cached models/controllers and unposted transactions. Existing per-table JSON exports are not full backups and are not accepted by this restore flow.

## Shared Dialog Presentation

`FullScreenModal` is the shared dialog shell for add forms and searchable selectors. It uses the native dialog element through a portal, providing focus containment, Escape dismissal, a labeled close button, backdrop dismissal, scroll locking, and focus restoration. Its component API remains title/onClose/children; feature controllers and persistence are unchanged.

`SearchableModal` composes that shell and renders filtered, keyboard-operable selection buttons with result counts and empty states. Search results derive directly from the query and current items, avoiding duplicated result state. `CustomForm.css` owns shared form presentation; shell and search styles are scoped to their own classes and use the existing theme variables for light and dark appearances. Item selection uses the shared Price component for the saved currency and precision preferences.

## Shared Data Tables

All catalog, customer, transaction-history, and customer-summary tables use `CustomTableView<T>` with typed `CustomTableColumn<T>` definitions. Customer-specific history reuses TransactionsView. Column definitions remain in their feature views; the shared component handles presentation only.

Columns support optional `align` and `variant` (`default`, `numeric`, `actions`) properties. Numeric and action variants align right by default; numeric cells use tabular digits. Table props provide accessible labels and feature-specific empty-state text. Row navigation supports click, Enter, and Space, while nested interactive controls keep their own behavior. Tables retain native table markup and scoped headers, and use a horizontally scrollable region on small screens. Styles are centralized in `CustomTableView.css` and use existing light/dark theme variables.

History detail pages display only the transaction identified by the URL. There is no global "previous transaction" action, since that could leave the selected customer's history. TransactionsView passes its current list URL through router state; TransactionPage offers a return link to that list, falling back to general transaction history for direct links. Detail loading reacts to the transaction ID, ignores stale responses, and reports missing or failed records inline. Customer-specific history waits for its scoped records before mounting TransactionsView, preventing a temporary fallback to all transactions.

## Typography and Page Headers

`src/styles/typography.css` defines semantic text tokens for captions, supporting text, body copy, section headings, dialog headings, and responsive page titles. It loads after the legacy global stylesheet. Keep ordinary body text readable on mobile; only the page-title token scales with viewport width.

Every page uses `components/Layout/PageHeader.tsx` for its single h1, optional description/eyebrow, and optional actions. Page headlines use Title Case. Avoid defining page-title font sizes in individual page stylesheets: change the shared token or component styles instead. Section and dialog headings use their semantic tokens; monetary totals can remain visually prominent. Feature-specific layout, behavior, and localized title strings remain in their existing components.

## Item Editing and Price History (Database Version 2)

ItemsPage provides Edit beside each item. ItemEditForm owns draft input and validation feedback, ItemsController validates the update, and ProductOS commits the name and optional price event atomically. Name changes affect catalog labels throughout the app; names are not versioned. Products referenced by saved sales cannot be deleted, preserving historical relationships. Unused product deletion also removes its price events.

The `PRODUCTS.amount` field remains the original price. `ITEM_PRICE_CHANGES` stores `{ id, itemId, amount, timestamp }`, represented by ItemPriceChange and managed by ItemPriceChangesOS. Its unique compound `itemTimestamp` index supports reverse cursor lookups for the latest event at or before a transaction timestamp. No qualifying event means use the original price. Catalog reads use the latest event. ProductItem keeps its original amount separately, so reserializing an item cannot silently overwrite the historical baseline.

TransactionsOS passes each saved transaction's timestamp into TransactionProductsOS. Each product line is reconstructed with ProductOS.getAtTimestamp, so quantities, percentage discounts, totals, and customer summaries calculate against the historical price. POS also resolves selected items at the ongoing sale's creation timestamp, including the first item; a sale keeps that date's pricing even if the catalog changes while it is open. Price changes apply immediately, cannot be backdated through the UI, and append rather than overwrite events. Equal-millisecond successive updates receive increasing timestamps to maintain deterministic ordering.

Database version 2 adds the history store in-place. Existing stores and records are preserved; the previous destructive upgrade routine has been removed. Connections close on version changes, allowing other tabs to upgrade. Full backups include price history; restoring an older version 1 backup adds an empty history table and continues using its original prices. Demo reset automatically includes the history store. Tests cover an actual version 1 fixture, boundary timestamps, multiple changes, historical totals, rename-only changes, deletion protections, and backup round trips.

Price History is available under History at `/price-history`. PriceHistoryPage uses PageHeader and the shared CustomTableView, with an optional item filter and loading/error/empty states. PriceHistoryController joins price events with current catalog names, walks each item's events from oldest to newest to derive the previous price (starting from its original amount), then returns newest-first entries. The page reads from the active workspace and uses Price for saved currency/precision formatting. Original product creation is not a change event and is not displayed as one.

Customer editing follows the same UI → controller → object-store boundary. CustomersView exposes Edit; CustomerEditForm handles drafts and save feedback, CustomerController validates and trims the input, and CustomerOS.updateOne replaces the existing schema in a single transaction. The ID remains unchanged, so existing customer-transaction links resolve to the updated details. Missing records are rejected instead of silently recreated. Customer names and phone numbers are not versioned; phone numbers remain optional text.

## Localized UI Text

All UI copy lives in `src/data/Text_EN.json`, including new pages, shared components, form labels, accessible labels, confirmations, empty states, and validation/status messages. Components can use the existing `useLocale()` dictionary or `useLocaleText()` for a typed lookup with interpolation. For example, `t('TABLE_RECORD_COUNT_OTHER', { count })` resolves a complete message; avoid assembling translated sentence fragments in JSX. Singular and plural messages have separate keys. The existing `rt()` interpolation helper remains available.

`LocaleKey` derives from the English dictionary, so invalid translation keys fail type checking. Navigation and settings definitions store translation keys while route paths, database identifiers, and settings group IDs remain stable. Non-React validation/persistence operations use `getLocaleText()` for messages from the active persisted locale. Settings validation accepts a translator so its inline messages follow the component's LocaleContext. User-entered names, sample fixture records, and technical identifiers are data rather than UI translations.

## Custom Locale Files and Language Selection

Settings separates Custom Language File operations from the Language selector. LocaleController downloads the complete current `Text_EN.json`, parses uploaded JSON, validates it, and saves or selects a locale. LocaleSettings owns file-input state, feedback, and the dropdown. Upload saves/replaces the custom dictionary; English remains selected until the user selects Custom. Uploading a replacement while Custom is selected applies it immediately.

`localization/locale.ts` owns typed keys, interpolation, validation, the current language snapshot, and browser persistence under `pos.locale`. Custom files contain a plain JSON object of translation keys to non-empty strings. Every provided recognized key must preserve the English template's placeholder names. Omitted keys inherit English, allowing older custom files to keep working after new text is added. Unknown keys are ignored; a file with no recognized entries is rejected. Failed validation or storage writes leave the previous dictionary and selection intact.

LocaleProvider subscribes through useSyncExternalStore and supplies the active merged dictionary through the existing LocaleContext. `useLocale`, `useLocaleText`, `rt`, and `getLocaleText` retain their import API. The non-React accessor reads the same active snapshot, so controller and database error messages follow the selected locale too. A single localStorage entry persists both the custom dictionary and selection, survives reloads, and synchronizes open tabs. Invalid saved preferences fall back to English. Locale preferences are browser-wide and separate from real/demo database backups.

## Responsive Layout

At widths up to 800px, NavBar renders a Menu disclosure instead of squeezing desktop links into a second row. Its groups expand inline, links close the menu after navigation, and Escape returns focus to the menu button. Desktop dropdown presentation remains unchanged. Menu labels live in Text_EN.json.

Shared layout rules in `styles/responsive.css` set fluid page gutters, stacked Settings controls and action buttons, compact POS spacing, and touch-sized controls. Below 600px, CustomTableView displays each record as a labeled card using the same column definitions and row actions; explicit table roles and visually hidden column headers preserve table semantics. Desktop tables remain tabular. Dialogs retain internal scrolling and a visible close header on small screens. The viewport permits browser zoom.

## Discount Selection

The POS Discount action opens DiscountForm, using the shared dialog and localized labels. Users choose Flat Amount or Percentage, enter a decimal value, and preview the currency deduction. DiscountValidator calculates and validates the amount: values must be finite and positive, percentages cannot exceed 100, and the deduction cannot exceed the remaining order total at application time. Percentages apply to the product subtotal, matching the existing Transaction calculation; they do not compound on previous discounts.

DiscountController revalidates the active, unposted transaction, constructs the existing DiscountItem with its selected DiscountItemType, waits for DiscountOS persistence, and adds the discount line only after the write succeeds. Flat and percentage types continue using the existing schema and transaction reconstruction. Discount quantities stay fixed at one when restored. The POS action is disabled for empty and posted orders. No database migration is required.

## Database-Backed Transaction Pagination (Version 3)

TransactionsView queries either all sales or one customer's sales, using PageOptions (`page`, `pageSize`, `sort`) and PageResult (`rows`, `total`, `page`, `pageSize`). Newest is the default and page size defaults to 10, with 25/50/100 available. usePagedQuery keeps controls in URL parameters, cancels stale UI responses, preserves customer filters, and resets to page 1 when size or sort changes. PaginationControls owns shared localized controls. Detail/back links preserve both list parameters and the originating customer-summary page.

`database/Pagination.ts` performs a native index count, advances a timestamp cursor over off-page entries without reading their values, and stops after one page. Transaction listings read lightweight TransactionListEntry projections: only selected headers and indexed product/discount line counts, with persisted totals. Full transaction models and historical item pricing are reconstructed only on detail pages. Customer-specific queries use the `CUSTOMERS_TRANSACTIONS.customerTimestamp` compound index on customerId and link timestamp; sort order is by linked-sale date.

The all-customers transaction list is grouped by customer. Database version 3 adds `CUSTOMER_TRANSACTION_SUMMARIES` (`id` = customer ID, `timestamp` = latest linked sale, `count`, `total`) and an ordered timestamp index. Linking a posted sale updates its summary in the same read/write transaction. Duplicate/failed link writes roll back the summary update. CustomerTransactionSummariesOS pages summaries first and resolves customer names only for those rows. Summaries keep lifetime counts and totals, rather than aggregating just the current page. Oldest sorts by the customer's most recent linked sale ascending; newest reverses that order. Customers with saved links cannot be deleted, preserving list relationships.

The additive version 3 upgrade creates the summary store, adds the customer compound index, and makes a one-time pass over existing links and saved transaction headers to build summaries. Normal page queries never scan all history or call getAll. Demo clearing includes the new store. Full backups include summaries; restores of versions 1/2 derive them from canonical links and saved totals, while version 3 backups validate summary consistency before writing.

Verification covers 35 sales across 12 customers, both sort directions, exact page sizes and indexed reads, page clamping, per-customer filtering, summary totals, duplicate-write rollback, an actual version 2 migration, older/current backup restore, browser navigation state, and mobile layout. Query instrumentation confirms only page-sized cursor values and selected related records are read, with no getAll during listing.
