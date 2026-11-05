# POS

A browser-based point-of-sale application built with React and TypeScript.

POS is designed as a fully client-side application: products, customers, transactions, discounts, and transaction history are persisted directly in the browser using IndexedDB. The application can also be installed as a Progressive Web App, allowing it to behave more like a traditional desktop or mobile application while remaining entirely web-based.

## Features

- Point-of-sale transaction interface
- Product and inventory management
- Customer management
- Customer transaction history
- Transaction history and navigation
- Discounts
- Transaction item and quantity management
- Multiple languages/localized UI text
- Configurable currency and decimal precision
- Persistent client-side data
- JSON-based database import/export support
- Installable Progressive Web App
- Responsive browser-based interface

## Tests

```sh
npm test
```

Run the local validation checks with `npm run check`. Browser interaction and mobile-layout tests are available through `npm run test:browser` after installing Playwright's Chromium (`npx playwright install chromium`).

See [Testing](docs/testing.md) for setup, watch mode, coverage, single-test commands, and test organization. Tests use isolated databases and do not touch your browser's real data.

## Architecture

The application separates the user interface, application logic, domain models, and persistence layer rather than coupling React components directly to IndexedDB.

```text
React UI
   │
   ▼
Controllers
   │
   ▼
Domain Models
   │
   ▼
Object Stores
   │
   ▼
IndexedDB
```

The database layer is built around a custom generic `ObjectStore` abstraction over the native IndexedDB API. Concrete object stores specialize that abstraction for products, customers, transactions, discounts, and relationships between them.

This means the application works with domain objects such as `Transaction`, `ProductItem`, and `Customer` while the persistence layer is responsible for converting those objects to and from database schemas.

See the technical documentation for a detailed explanation:

- [Architecture](docs/architecture.md)
- [Database Architecture](docs/database.md)

## Client-Side Application

POS does not require a backend server for its core functionality. The application's persistent data lives in the browser.

IndexedDB provides structured persistent storage for application data, while browser storage is also used for client-level preferences such as currency configuration and decimal precision.

This makes the application particularly suited to environments where a local, installable POS experience is desirable without requiring a constantly available server.

## Progressive Web App

POS is configured as a Progressive Web App using Vite's PWA tooling.

The application registers the PWA with automatic update behavior, allowing it to be installed from a supported browser and used in a more application-like environment.

## Localization

User-facing text is separated from the application logic through locale data and React context.

The project currently includes localization data for:

- English
- Hindi (incomplete)
- Nepali (incomplete)
- Urdu (incomplete)

The localization system also supports parameterized text replacement for messages containing dynamic values.

## Technology

- React
- TypeScript
- Vite
- IndexedDB
- React Router
- TanStack React Table
- React Icons
- UUID
- Vite PWA

## Development

Clone the repository and install the dependencies:

```bash
git clone https://github.com/satishkhanal76/POS.git
cd POS
npm install
```

Start the development server:

```bash
npm run dev
```

The application will then be available through the local Vite development server.

## Project Structure

```text
src/
├── components/       # React UI components and pages
├── contexts/         # Application-wide React contexts
├── controllers/      # Application/data access controllers
├── database/         # IndexedDB implementation and object stores
├── data/             # Localization and client configuration
├── models/           # Domain models
├── validators/       # Input validation
└── Data-Structures/  # Supporting data structures
```

The most substantial architectural pieces are the `models`, `controllers`, and `database` layers. Together they keep the application's domain logic and persistence concerns separate from the React presentation layer.

## Why This Project?

One of the main technical goals of POS was to build directly on the browser's native IndexedDB API rather than relying on a third-party IndexedDB abstraction.

IndexedDB is a relatively low-level API with an event-driven interface and a number of awkward details around transactions, object stores, indexes, serialization, and asynchronous operations. Instead of hiding those problems behind an external library, this project builds a reusable abstraction around them.

The result is a database layer that allows the rest of the application to work with strongly typed TypeScript models while still using native browser persistence underneath.

That abstraction is documented in detail in [Database Architecture](docs/database.md).