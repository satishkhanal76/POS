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

- `database/Database.ts` accepts an optional database name (default `POS`) and shares an in-flight connection promise to avoid duplicate connections during concurrent reads.
- `database/DatabaseStores.ts` is the composition factory for the database and its related object stores. DatabaseContext selects the real or demo instance at page load.
- `data/demoData.ts` contains editable product and customer fixtures.
- `controllers/WorkspaceController.ts` owns first-visit checks, mode selection, demo seeding, and reset operations. Fixtures pass through existing domain models and object-store schema converters. Clearing and optional seeding run in one IndexedDB transaction across every demo store, including transaction relationships, so a reset cannot leave partial data. This workspace-level operation intentionally coordinates multiple stores rather than being placed in an individual feature controller.
- `components/Workspace` contains the first-visit dialog, persistent demo banner, and Settings controls. Components call the workspace controller rather than accessing IndexedDB.

The first-visit offer appears only when no real records exist and no choice has been remembered. A localStorage flag remembers that choice. The selected workspace is stored in sessionStorage, so selecting demo affects the current tab and survives reloads. Demo records persist until explicitly cleared or restarted; they are shared by tabs using `POS_DEMO`. Clearing leaves an empty demo workspace; restarting replaces all demo activity with fresh fixtures. Returning to the real workspace preserves demo records. Switching or resetting reloads the app to discard cached controllers and unposted transactions. Real records are never copied, seeded, or cleared by demo operations.

## Database Backup and Restore

Settings downloads a compressed ZIP backup of the active database. `manifest.json` contains the format/schema version, source database name, timestamp, and each table's part filenames and row counts. Each table has its own `tables/TABLE_NAME/` folder. JSON arrays split at 1,000 records or approximately 1 MiB of UTF-8 JSON (a single oversized record remains intact). Restore accepts only a complete ZIP; old single-JSON files are not supported.

`DatabaseBackupStore.exportParts` reads raw records with cursors in one readonly snapshot transaction. It serializes bounded batches directly to `backup/BackupArchive`, which incrementally compresses entries with fflate. The export retains compressed ZIP chunks for the final downloadable Blob, rather than cloning the database or constructing one huge JSON string. Restore currently decompresses and validates the full archive in memory before writing, so it is not an unlimited-size streaming import.

`BackupController` coordinates ZIP transport, download and persistence. `BackupSettings` owns archive selection, table-count preview, replacement confirmation and reload. ZIP inspection checks manifest structure, ordered part paths, counts, table completeness and record relationships. An in-memory snapshot representation remains available for internal callers; it is not a supported single-file import/export format. Restore clears/writes all tables in one transaction; any write failure aborts the replacement. Schema validation/migrations must be maintained with future database changes.

Only the active real/demo database is backed up and replaced; source metadata never selects the destination. Display/language settings and unposted transactions are excluded. Reload after restore discards cached models and unposted drafts. Per-table item exports are separate tools and are not full-workspace backups.

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

Settings also offers Switch to Demo while in the real workspace. WorkspaceController.useDemoWorkspace changes only the tab selection and reloads; it never clears, seeds, or otherwise writes database records. Start Fresh Demo remains the explicit reset-and-seed action, and Clear Demo Data remains the explicit wipe action. Resuming an empty or cleared demo leaves it empty.


Fresh demo data is described by `data/demoData.ts` and built by DemoDataController through existing domain models and schema converters. The seed contains six products, three customers, 24 posted sales over the preceding 12 days, 18 customer links, two discount definitions, six price changes, and complete customer summaries. Sale products resolve their effective historical price before totals are calculated. All records are prepared before the reset transaction starts, then every table is cleared and refilled atomically. Both asynchronous IndexedDB errors and synchronous write failures roll back the reset. Switching to an existing demo continues to preserve it; expanded fixtures apply only to explicit fresh starts/restarts.

## Notifications and Quantity Editing

NotificationProvider supplies the shared `useNotifications().notify(message, tone)` API. It renders up to three themed, non-modal pill notifications in a fixed, safe-area-aware stack. Success/info messages expire after 4.5 seconds; errors expire after 6.5 seconds. Hover or keyboard focus pauses expiration, and an optional close control allows early dismissal. Live-region roles announce messages without moving focus. All labels and message templates live in Text_EN.json.

POS success feedback for posting, customer linking, quantity changes, discounts, and clearing an order uses this provider. Save failures retain the current order and display an error pill. A save-in-flight guard prevents duplicate submission. If posting succeeds but customer linking fails, the order is marked posted and can retry only the customer link, avoiding a duplicate sale.

QuantityForm uses the shared FullScreenModal and form styling, with the current quantity prefilled and a line-total preview. QuantityValidator accepts safe, positive whole numbers without silently truncating fractional input. Validation stays inline; Save mutates the existing in-memory transaction model and the values persist when the sale is posted. Cancel/Escape leave quantities unchanged. Discount lines keep fixed quantities, and posted transactions cannot be edited. Browser-native alerts and quantity prompts are no longer used for POS feedback; explicit destructive confirmations remain separate decisions.

### Customer payments

Payments are distinct transaction headers (`kind: "payment"`) with negative totals and no product or discount lines. Older headers without a kind remain sales. The Transaction model reconstructs payments from their saved amount; payment details and paged histories label them explicitly.

On the POS, Record Payment creates a draft. Add to Customer commits the payment header, customer link and summary balance together through CustomersTransactionsOS.recordPayment. Failures leave the draft available to retry; payments cannot be posted without a customer. Sales increase the summary total and payments decrease it; a negative balance represents customer credit. Counts include both sales and payments. Backups preserve the optional kind and derive balances from signed saved totals. No IndexedDB store/index migration is needed.

### Admin dashboard

`dashboard/period.ts` defines local calendar ranges (Monday-based weeks and inclusive custom end dates, converted to an exclusive upper bound). `database/DashboardOS.ts` scans the TRANSACTIONS timestamp index only within that range and reads linked customers and product quantities through their transactionId indexes in the same read-only transaction. It does not reconstruct item prices or load full transaction models.

`controllers/DashboardController.ts` aggregates these projections into period metrics and zero-filled daily/monthly buckets. `DashboardPage` owns date controls, refresh and loading/error states; out-of-date responses cannot replace the selected range. All labels use locale keys. The dashboard follows the active real/demo database.

Sales metrics exclude payment headers; payments received is the positive magnitude of payment totals. Customers handled means distinct customer IDs currently assigned to selected transactions. Customer balance change is linked sale totals minus payment amounts for the period, not lifetime receivables or cash revenue. Transactions are filtered by their original timestamp rather than the later customer-link timestamp.

Dashboard presentation is split into `components/Dashboard/DashboardFilters`, `DashboardMetrics`, `DashboardTrend`, `TopSellingItems`. `DashboardPage` composes these sections and owns only the shared filter/refresh controls; `hooks/useDashboardSummary` handles cancellable period queries.

Top-selling items aggregate the selected sales' product quantities and historical unit prices. Ranking uses quantities or gross item values before transaction-wide discounts (not net item revenue). `DashboardOS` reads the effective price using the itemTimestamp index within its snapshot transaction; it does not use today's price.

`CustomerBalancesOS` reads current customer records and derived summaries in one snapshot independently of period filters. It filters/searches/sorts balance projections, then returns only the requested page. Summary totals include all customers regardless of the table filters. Without a balance index, this query scans customer records and summary lookups; it never loads past transaction rows. Zero balances include customers without history. Floating-point residues below 1e-7 are treated as settled.

Customer balance management lives in `components/Customer/CustomerBalances` inside a collapsed dashboard disclosure. Customer Transactions retains its transaction summary list. Shared report styles live in `styles/Reports.css`; `utils/CollapsibleReport` provides accessible native disclosures for detailed reports.

### Shared form controls

`components/Forms/Select` renders all single-select dropdowns throughout settings, pagination, discounts, price history and dashboard reports. Callers supply the selected value, a value callback and localized option labels. The shared listbox supports arrow/Home/End navigation, type-ahead, Enter/Space selection, Escape, outside dismissal and disabled choices. Its menu uses the browser top layer for positioning above scroll containers and modal dialogs, with a fixed-position fallback.

`components/Forms/DateInput` provides an editable ISO date and themed calendar dialog with month/year controls. `styles/forms.css` supplies common input surfaces, focus/invalid/disabled states and removes native number spinners. Settings' existing custom toggles remain intact. New forms should reuse these controls instead of native select or date-picker widgets.

### Destructive workspace reset

Settings ends with DatabaseResetSettings, a separate danger section. The flow identifies the active database by its connection name, offers ZIP backup, requires exact name entry, and then a separate final erase confirmation. DatabaseResetController delegates to DatabaseResetStore, which checks the name again and clears every current object store in one readwrite transaction. A failed transaction rolls back the whole reset. The valid schema is retained, while items, customer records, sales/payments, relationships and derived summaries are emptied. No other database, localStorage preferences, custom language file or downloaded backup is touched. Success requires a reload before continued use to discard cached models and unsaved orders. Other POS tabs should be closed first.

All files under src/database use .ts because they contain no JSX. Models and database classes do not require .tsx; JSX is what determines that extension.

### Reports, periods and activity tables

Reports navigation exposes `/dashboard` for collapsible sales transactions, customer payments, customers handled and items sold, and `/overview` for metrics, trends, rankings and current all-time balances. Both use `useReportPeriod` and `DashboardFilters` for URL-backed day/week/month/year/custom/all-time controls. All-time removes the timestamp bound; trend buckets then span the first through last saved transaction rather than the artificial all-time boundaries.

TransactionsView shares those date controls with general and individual customer history. TransactionHistoryController delegates to TransactionHistoryStore: unrestricted date-only queries use timestamp-index count/offset pagination; kind/customer filters scan headers within the timestamp bounds and read customer links through the transactionId index. Only the requested page's full list projections (headers and indexed line counts) is loaded. Kind/customer counts require examining matching-range headers because there is no compound original-timestamp/customer/kind index. Filtering never uses a customer's later link timestamp. Existing legacy customerTimestamp pagination APIs remain for other callers.

Dashboard sales and payment tables have independent URL page/size/sort namespaces. CustomersHandled carries period/date/end to the chosen customer's history, and navigation back preserves the report period. Shared pagination uses numeric pageSize 0 for All; it intentionally loads every matching row only when chosen. Aggregate item/customer/trend reports use ReportTable to page computed projections; these aggregates necessarily read the selected period's related data to calculate totals and rankings. CustomerBalances stays explicitly all-time, with its own status/search filters and All page-size option.

### Optional stock management (schema version 4)

Settings adds a Stock Management group. `stockManagement` and `forceStockAdherence` default to false; the latter only takes effect when the former is enabled. Both use the existing draft/save/discard settings form. Disabling the master hides stock controls and pauses deductions without deleting counts. Enabling on an existing workspace does not backfill old sales: a missing stock row means zero, so users should set their actual counts first.

`models/Stock.ts` defines `{ id: productId, count }`; `database/StockOS` owns the STOCK table and absolute-count edits. Counts are safe integers. Manual counts are nonnegative; advisory sales may produce negative counts. `StockController` handles fresh quantity checks; `useStockCounts` supplies UI projections and refreshes after updates or returning focus. ItemsView provides an In Stock column and a separate StockForm. ItemSelectionModal displays counts beside each item while the feature is active.

Adding an item checks the whole draft quantity for that product, rather than only the next unit. QuantityForm awaits its validation so enforcement errors stay visible in the form. Stock is not reserved by draft orders: removing/voiding an order needs no stock adjustment.

`TransactionsOS.postTransaction` now commits the saved header, product/discount lines and stock deductions in one readwrite transaction. The posting-time stock check happens under the same write lock as the update, preventing concurrent tabs from overselling when enforcement is enabled. Duplicate headers or any failed request roll back all changes. Advisory shortages commit and emit localized warning notifications after success. The model is marked posted only after commit. Linking an already-posted sale to a customer, retrying a failed customer link, and payments never deduct stock again.

Version 4 adds STOCK without modifying existing records or rebuilding customer summaries. Full ZIP backups include stock; older schema backups migrate to an empty stock table. Stock references are validated against product IDs on restore; negative advisory counts remain valid. Product deletion removes its stock record in the same transaction. Workspace reset/restore operate on every current store. Fresh demo fixtures include current counts.

### Soft deletion and historical inclusion (schema version 5)

Products, customers and transaction headers have optional `deletedAt` timestamps. Missing fields mean active, so the version 5 upgrade preserves existing records without rewriting them. ObjectStore reads accept `includeDeleted = false`; ordinary selectors and lists exclude deleted roots. Root model converters retain deletion metadata. Historical product reads explicitly include deleted items and resolve their original/effective transaction-date prices; deleting a catalog item never destroys those records.

Settings adds Soft Deletion → Show Soft Deleted Toggle (off by default). `useDeletedVisibility` gates the URL's deleted=1 mode; shared radio controls appear on item/customer lists, histories and report pages only when enabled. Disabling the setting hides controls and excludes deleted records from lists, while historical line-item reads still work. Table rows and historical items carry a Deleted badge. Inclusion is a read-only historical projection, not a restore operation: it does not mutate live balances or inventory.

`DeletionStore` is the atomic boundary for soft/hard root deletion. It serializes all store access in one write transaction, marks the root, and rebuilds canonical customer summaries from remaining active transaction headers and saved links. Soft-deleted transactions retain headers, line items and links but contribute nothing to default reports, counts or balances. Deleted customers are hidden from normal lists/selectors without deleting their historical sales. `CustomerActivityStore` uses canonical summaries normally and recomputes an inclusive projection only for historical deleted-record viewing. TransactionHistoryStore applies deletion filtering before counting and paging.

Sales posted from this release record `stockDeducted`. Deleting one reverses its known product deductions once and marks `stockReversed`; later hard deletion does not restock twice. Older sales lack trustworthy information about whether stock tracking was enabled at posting, so inventory is not guessed for those records. The transaction confirmation explains manual stock correction may be necessary for older sales. Payments have no stock effect. New sales/links reject products, customers or headers that were deleted while an order/dialog was open.

`DeleteRecordButton` confirms every soft deletion. A second deletion is available only for already-deleted roots and requires exact name/ID entry plus a permanent-loss warning. Hard product deletion cascades to every containing transaction and its lines/links, then removes the product's price history and stock. Hard customer deletion cascades to all linked sales/payments and their related records. Hard transaction deletion removes its header, lines and links. All cascades rebuild summaries atomically, preventing dangling foreign keys. These consequences are spelled out in the confirmation; users are advised to download a backup first.

ZIP backup export retains every raw record, including deleted metadata. Validation checks optional deletion/stock-tracking fields and derives expected canonical summaries from active transaction headers only. Hard cascades keep backup references valid. Older schemas migrate to version 5 through the existing additive migration path.

### Unlinking a customer assignment

Transaction details offers Unlink Customer with an explicit confirmation. CustomersTransactionsController delegates to CustomersTransactionsOS.unlinkTransaction, which verifies the currently expected customer under a write lock, archives the active relationship(s) with deletedAt and recomputes that customer's summary from their remaining active relationships and non-deleted headers. An empty summary is removed. A concurrently changed assignment aborts the whole operation. The transaction header, product/discount lines and stock are unchanged.

Archived assignments are an audit trail, not current customer links: selectors, history queries, report projections and summary calculations ignore them even in root-deleted-record viewing mode. Re-linking ignores archived assignments and creates a new active relationship. A payment may be explicitly unlinked and later linked again; ZIP validation therefore permits zero or one active payment assignment while retaining/validating archived relationships. Overall payment totals still count the saved payment, but customer balance movement counts linked payments only. Hard customer deletion cascades only through current assignments and removes archived pointers without deleting their now-unlinked transactions.

### Printable reports / Save as PDF

Reports and histories expose Print / Save PDF. `PrintReportButton` loads the print renderer on demand and renders `PrintableDocument` into a separate local iframe, then opens that frame's print dialog. Users choose Save as PDF or a physical printer. Current language, currency and decimal settings are passed into the print rendering contexts. All strings are localized. The app itself is not restyled, expanded or navigated to print. No data is sent to a remote PDF service.

The print document includes the report title, local date boundaries (or All Time), real/demo workspace, generation timestamp and deleted-record scope. It has its own light, A4-friendly stylesheet, repeated table headers and print-safe row wrapping, without navigation, actions, pagination or hidden panels. Generated reports include all matching rows, not only the current screen page. No sale posting, stock change or database migration occurs during printing.

`PrintReportsController` builds complete Dashboard/Overview exports from one DashboardOS snapshot, using the same pure DashboardController.summarize aggregation as the page. Dashboard exports include sales, payments, handled customers and item sales; Overview exports include metrics, exact trend data and item rankings. Individual aggregated sections print their full sorted projections via `ReportTable` and `printTable`; transaction lists explicitly query pageSize=All with the current period, sort, customer and deletion filters. Customer transaction exports include the customer's name. Customer balance exports deliberately use all-time balances and retain the current status/search filters, rather than incorrectly using the period filter. Customer summary exports are all-time as well.
