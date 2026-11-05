# Testing

The project has two test layers. Both run from Node. Core tests use Node's built-in test runner, TypeScript through `tsx`, and `fake-indexeddb`. Browser tests use the same runner with Playwright and an automatically started local Vite server.

Use a recent Node version with `--import` and `--test-timeout` support (Node 22.13+). The suite was verified with Node 23.11. Install dependencies with `npm ci` after cloning.

## Commands

| Command | Runs |
| --- | --- |
| `npm test` | Core model, controller, database, validation, and localization tests |
| `npm run test:watch` | Core tests again when imported files change |
| `npm run test:types` | Type-checks application code and all tests |
| `npm run lint:tests` | Lints the test suite |
| `npm run test:coverage` | Core tests with a terminal V8 coverage report |
| `npm run check` | Test types, test lint, core tests, and production build |
| `npm run test:browser` | Browser interaction and responsive-layout checks |
| `npm run test:all` | `check` plus browser tests |

The full application lint command (`npm run lint`) remains separate because existing application files have lint issues outside this testing work. `check` does not suppress or change those rules.

Run a single test file:

```sh
node --import tsx --test tests/price-history.test.ts
```

Run tests matching a name:

```sh
node --import tsx --test --test-name-pattern="rollback|rolls back" tests/*.test.ts
```

## Browser Setup

Install the test browser once:

```sh
npx playwright install chromium
npm run test:browser
```

Alternatively, use an existing Google Chrome installation:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

On Linux, Playwright may also need system packages; use `npx playwright install --with-deps chromium` when setting up a Linux test machine. Browser tests start and stop their own Vite server on an available loopback port. No existing development server is required.

## What Is Covered

| Test file | Main behavior |
| --- | --- |
| `models.test.ts` | Line merging, quantities, totals, discounts, original prices, unique IDs |
| `controllers.test.ts` | Creating/posting sales, controller boundaries, legacy JSON operations |
| `editing.test.ts` | Item/customer edits, stable IDs, linked-history preservation, deletion guards |
| `price-history.test.ts` | Effective-date boundaries, successive changes, historical totals, history listing |
| `discounts.test.ts` | Flat/percentage deductions, decimals, limits, saved types/totals, failed writes |
| `pagination.test.ts` | Newest/oldest, page limits, customer ranges, lifetime summaries, bounded reads |
| `migrations.test.ts` | Actual version 1/2 databases upgrading without data loss, fresh schema, concurrent connections |
| `backups.test.ts` | Every-table round trips, old backup compatibility, validation, atomic rollback, workspace isolation |
| `settings.test.ts` | Typed drafts, validation, defaults, persistence and notification failures |
| `localization.test.ts` | English/Nepali/custom, placeholders, uploads, storage synchronization and fallback |
| `localization-audit.test.ts` | Built-in placeholder compatibility and preventing literal JSX copy |
| `demo-data.test.ts` | Complete fresh-demo fixtures, historical pricing, linked summaries, relative dates, atomic reset failure |
| `workspaces.test.ts` | First-visit choice, demo seeding/restart/clear, real-data isolation |
| `browser/app.test.ts` | Pagination/back links, phone/tablet overflow, menu/dialogs, editing, discounts, locale/template uploads, backup download/restore |

Pagination tests deliberately fail if history listing calls `getAll` or hydrates full transaction models. They also record the transaction IDs read for a page. Backup tests inject a write failure after clearing starts, proving the whole operation rolls back.

Coverage reports describe modules exercised by the core suite; they are not a claim that every React component or visual state is covered. Browser tests assert interaction and element bounds, rather than comparing pixel screenshots. They cannot replace a final manual visual review on actual devices.

## Isolation and Fixtures

Each core test gets a new IndexedDB factory, localStorage, sessionStorage, and browser event target. Each browser test gets a fresh temporary browser context with its own IndexedDB and storage. External browser requests, including analytics, are blocked. Neither test layer opens your normal browser profile or its real POS data.

`tests/helpers/environment.ts` provides storage/events and request/transaction helpers. `tests/helpers/fixtures.ts` builds catalogs and sales through the existing models/object stores. Its legacy fixtures create real old IndexedDB schemas before opening them through the current database layer.

Dates and IDs are fixed where ordering matters. Price-boundary tests mock the clock instead of sleeping. Fault-injection mocks automatically restore after each test. Asynchronous operations must be awaited so failures cannot pass unnoticed. Tests run with timeouts to expose hangs.

To add a regression test, put it beside the relevant feature tests, start with `beforeEach(resetEnvironment)`, reproduce the user-visible failure through the appropriate layer, and assert the persisted result. Prefer the real object stores with the in-memory database; mock only a boundary needed to simulate failure. Add a browser case when behavior depends on routes, focus, dialogs, or responsive layout.

## Bugs Found by the Initial Suite

The numeric-validator regressions exposed and fixed valid values being replaced when fallback was disabled, ignored zero bounds, stale invalid state while parsing decimals, incorrect exclusive decimal bounds, and null/non-finite float handling. These cases remain in `validators.test.ts`.
