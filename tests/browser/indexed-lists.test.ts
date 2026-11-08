import { availablePort } from "../helpers/availablePort";
import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { createServer, ViteDevServer } from "vite";
import english from "../../src/data/Text_EN.json";

let server: ViteDevServer,
  browser: Browser,
  context: BrowserContext,
  page: Page,
  base: string;
let errors: string[];
before(async () => {
  const port = await availablePort();
  server = await createServer({
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}${server.config.base}`;
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  });
});
after(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
  });
  await context.route("https://**/*", (route) => route.abort());
  await context.addInitScript(() => {
    localStorage.setItem("pos.welcomeSeen", "true");
    localStorage.setItem(
      "pos.clientGlobal",
      JSON.stringify({ purchasing: true }),
    );
    sessionStorage.setItem("pos.workspace", "demo");
    const reads: string[] = [];
    Object.defineProperty(window, "listReads", { value: reads });
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      reads.push(`${this.name}/${String(key)}`);
      return original.call(this, key);
    };
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator(".page-header").first().waitFor();
  await page.evaluate(async (base) => {
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const { default: Product } = (await import(
      `${base}src/models/ProductItem.ts`
    )) as typeof import("../../src/models/ProductItem");
    const { default: Contact } = (await import(
      `${base}src/models/Contact.ts`
    )) as typeof import("../../src/models/Contact");
    const { default: Transaction } = (await import(
      `${base}src/models/Transaction.ts`
    )) as typeof import("../../src/models/Transaction");
    const { default: Link } = (await import(
      `${base}src/models/CustomerTransaction.ts`
    )) as typeof import("../../src/models/CustomerTransaction");
    const stores = createDatabaseStores("POS_DEMO");
    const product = new Product({ id: "coffee", name: "Coffee", amount: 5 });
    await stores.itemOS.addOne(product);
    const contacts = Array.from(
      { length: 35 },
      (_, index) =>
        new Contact({
          id: `c${index}`,
          name: `Contact ${String(index).padStart(2, "0")}`,
          phoneNumber: `555-${index}`,
        }),
    );
    await stores.contactOS.addMany(contacts);
    await stores.itemOS.addMany(
      Array.from(
        { length: 35 },
        (_, index) =>
          new Product({
            id: `p${index}`,
            name: `Item ${String(index).padStart(2, "0")}`,
            amount: index + 1,
          }),
      ),
    );
    for (let index = 0; index < 35; index++) {
      const transaction = new Transaction(
        `sale-${index}`,
        1700000000000 + index * 1000,
      );
      transaction.addProductItem(product);
      await stores.transactionsOS.postTransaction(transaction);
      await stores.cutomersTransactionsOS.addOne(
        new Link({
          id: `link-${index}`,
          customer: contacts[index % 12],
          transaction,
          timestamp: transaction.getTimestamp(),
        }),
      );
    }
    await stores.cutomersTransactionsOS.recordPayment(
      new Transaction("customer-payment", 1700000100000, 3),
      contacts[0],
    );
    for (let index = 0; index < 15; index++) {
      await stores.purchasingOS.receive({
        contactId: contacts[0].getId(),
        timestamp: 1700000200000 + index * 1000,
        reference: `INV-${index}`,
        lines: [
          { productId: product.getId(), quantity: 1, unitCost: index + 1 },
        ],
      });
      await stores.purchasingOS.pay(
        contacts[0].getId(),
        index + 1,
        1700000300000 + index * 1000,
        `INV-${index}`,
      );
    }
    for (let price = 6; price <= 20; price++)
      await stores.itemOS.updateDetails("coffee", "Coffee", price);
    (await stores.database.getDatabase()).close();
  }, base);
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, []);
});
async function go(path: string) {
  await page.goto(`${base}${path}`);
  await page.locator(".page-header").first().waitFor();
}
async function choose(label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function rows(count: number) {
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll(".custom-table tbody tr").length === count,
    count,
  );
}
async function transactionReads() {
  return page.evaluate(
    () =>
      (window as unknown as { listReads: string[] }).listReads.filter((read) =>
        read.startsWith("TRANSACTIONS/"),
      ).length,
  );
}

test("native IndexedDB pages filters and ranked transaction sorts without hydrating other records", async () => {
  await go("transactions?period=all&kind=sale&sort=items-high");
  await page.getByText("1–10 of 35", { exact: true }).waitFor();
  await rows(10);
  assert.equal(await transactionReads(), 10);
  await page
    .getByRole("button", { name: english.PAGINATION_NEXT, exact: true })
    .click();
  await page.getByText("11–20 of 35", { exact: true }).waitFor();
  assert.equal(await transactionReads(), 20);
  await choose(english.PAGINATION_SORT, english.SORT_TOTAL_LOW);
  await page.getByText("1–10 of 35", { exact: true }).waitFor();
  await page
    .locator(".pagination-field")
    .filter({ hasText: english.FILTER_TYPE })
    .getByRole("combobox")
    .click();
  await page
    .getByRole("option", { name: english.REPORT_PAYMENTS, exact: true })
    .click();
  await page.getByText("1–1 of 1", { exact: true }).waitFor();
  await rows(1);
});

test("catalog search and price history pagination work on a narrow phone", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go("contacts");
  await page.getByText("1–10 of 35", { exact: true }).waitFor();
  await page
    .getByRole("searchbox", { name: english.SEARCH_CONTACTS })
    .fill("555-34");
  await page.getByText("1–1 of 1", { exact: true }).waitFor();
  await page.getByText("Contact 34", { exact: true }).waitFor();
  await go("items");
  await page
    .getByRole("searchbox", { name: english.SEARCH_ITEMS })
    .fill("Item 2");
  await page.getByText("1–10 of 10", { exact: true }).waitFor();
  await rows(10);
  await go("price-history");
  await page.getByText("1–10 of 15", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: english.PAGINATION_NEXT, exact: true })
    .click();
  await page.getByText("11–15 of 15", { exact: true }).waitFor();
  await rows(5);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  assert.equal(overflows, false);
});

test("purchasing merges pages and filters supplier payments correctly", async () => {
  await go("purchasing?period=all");
  await page.getByText("1–10 of 30", { exact: true }).waitFor();
  await page
    .locator(".pagination-field")
    .filter({ hasText: english.FILTER_TYPE })
    .getByRole("combobox")
    .click();
  await page
    .getByRole("option", { name: english.BUY_PAYMENTS, exact: true })
    .click();
  await page.getByText("1–10 of 15", { exact: true }).waitFor();
  await choose(english.PAGINATION_SORT, english.SORT_TOTAL_LOW);
  await page.getByText("1–10 of 15", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: english.PAGINATION_NEXT, exact: true })
    .click();
  await page.getByText("11–15 of 15", { exact: true }).waitFor();
  await rows(5);
  await page.locator(".custom-table tbody tr").first().click();
  await page
    .getByRole("heading", { name: english.BUY_PAYMENT, exact: true })
    .waitFor();
  await page.locator("main > .page-back-link").click();
  await page.getByText("11–15 of 15", { exact: true }).waitFor();
});

test("an existing workspace opens without rebuilding history and remains usable during preparation", async () => {
  const result = await page.evaluate(async (base) => {
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const { default: History } = (await import(
      `${base}src/database/TransactionHistoryStore.ts`
    )) as typeof import("../../src/database/TransactionHistoryStore");
    const source =
      await createDatabaseStores("POS_DEMO").database.getDatabase();
    const definitions = [...source.objectStoreNames].map((name) => {
      const store = source.transaction(name).objectStore(name);
      return {
        name,
        keyPath: store.keyPath,
        indexes: [...store.indexNames].map((name) => {
          const index = store.index(name);
          return {
            name,
            keyPath: index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry,
          };
        }),
      };
    });
    const request = indexedDB.open("legacy-native", 13);
    request.onupgradeneeded = () => {
      for (const definition of definitions) {
        const store = request.result.createObjectStore(definition.name, {
          keyPath: definition.keyPath,
        });
        for (const index of definition.indexes)
          store.createIndex(index.name, index.keyPath, {
            unique: index.unique,
            multiEntry: index.multiEntry,
          });
      }
      const tx = request.transaction!;
      for (let index = 0; index < 1500; index++) {
        tx.objectStore("TRANSACTIONS").add({
          id: String(index).padStart(6, "0"),
          timestamp: 1000 + index,
          total: 5,
        });
        tx.objectStore("TRANSACTION_PRODUCTS").add({
          id: `line-${index}`,
          transactionId: String(index).padStart(6, "0"),
          productId: "p0",
          quantity: 1,
        });
      }
      for (let index = 0; index < 500; index++)
        tx.objectStore("PRODUCTS").add({
          id: `p${index}`,
          name: `Product ${index}`,
          amount: 5,
        });
      for (let index = 0; index < 200; index++)
        tx.objectStore("CUSTOMER").add({
          id: `c${index}`,
          name: `Contact ${index}`,
          phoneNumber: "",
        });
    };
    const previous = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    previous.close();
    const stores = createDatabaseStores("legacy-native");
    const database = await stores.database.getDatabase();
    const query = new History(stores.database),
      options = { page: 1, pageSize: 10, sort: "newest" as const },
      range = { start: 0, end: Number.MAX_SAFE_INTEGER, all: true };
    const first = await query.getPage(options, range);
    const noHistoryWork =
      localStorage.getItem("pos.indexing.legacy-native.TRANSACTIONS") === null;
    const items = await stores.itemOS.getCatalogPage(options);
    const contacts = await stores.contactOS.getCatalogPage(options);
    const ranked = query.getPage({ ...options, sort: "items-high" }, range);
    const available = await stores.itemOS.getCatalogPage(options);
    const stillPreparing = !JSON.parse(
      localStorage.getItem("pos.indexing.legacy-native.TRANSACTIONS") ?? "{}",
    ).done;
    const sorted = await ranked;
    database.close();
    return {
      version: database.version,
      total: first.total,
      visible: first.rows.length,
      noHistoryWork,
      items: items.total,
      contacts: contacts.total,
      stillAvailable: available.rows.length,
      stillPreparing,
      sorted: sorted.rows.length,
    };
  }, base);
  assert.deepEqual(result, {
    version: 14,
    total: 1500,
    visible: 10,
    noHistoryWork: true,
    items: 500,
    contacts: 200,
    stillAvailable: 10,
    stillPreparing: true,
    sorted: 10,
  });
});

test("order pickers show recent favorites, search beyond the first page, and respect saved limits", async () => {
  await page.evaluate(async (base) => {
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const { default: Transaction } = (await import(
      `${base}src/models/Transaction.ts`
    )) as typeof import("../../src/models/Transaction");
    const { default: Link } = (await import(
      `${base}src/models/CustomerTransaction.ts`
    )) as typeof import("../../src/models/CustomerTransaction");
    const stores = createDatabaseStores("POS_DEMO");
    const product = await stores.itemOS.getOne("p34"),
      customer = await stores.contactOS.getOne("c34");
    for (let index = 0; index < 2; index++) {
      const transaction = new Transaction(
        `favorite-${index}`,
        Date.now() - 86400000 - index * 1000,
      );
      transaction.addProductItem(product);
      await stores.transactionsOS.postTransaction(transaction);
      await stores.cutomersTransactionsOS.addOne(
        new Link({
          id: `favorite-link-${index}`,
          timestamp: transaction.getTimestamp(),
          transaction,
          customer,
        }),
      );
    }
    (await stores.database.getDatabase()).close();
  }, base);
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".modal-item").length === 10,
  );
  await page
    .locator(".modal-item")
    .first()
    .getByText("Item 34", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.PICKER_MORE, exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".modal-item").length === 20,
  );
  await page.getByRole("searchbox").fill("Item 33");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".modal-item").length === 1 &&
      document.querySelector(".modal-item")?.textContent?.includes("Item 33"),
  );
  await page.locator(".modal-item").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: english.BUTTON_ADD_TO_CUSTOMER, exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".modal-item").length === 10,
  );
  await page.waitForFunction(() =>
    document
      .querySelector(".modal-item .name")
      ?.textContent?.startsWith("Contact 34"),
  );
  await page
    .getByRole("searchbox", { name: english.SEARCH_CONTACTS })
    .fill("555-33");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".modal-item").length === 1 &&
      document
        .querySelector(".modal-item")
        ?.textContent?.includes("Contact 33"),
  );
  await page.keyboard.press("Escape");
  await go("settings");
  await page.getByLabel(english.PICKER_LIMIT, { exact: true }).fill("5");
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();
  await page.getByRole("link", { name: "POS home", exact: true }).click();
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".modal-item").length === 5,
  );
  assert.equal(await page.getByRole("searchbox").inputValue(), "");
});

test("catalog toolbars sort complete results and reveal live stock sorting only when enabled", async () => {
  await go("items");
  await page.getByText("1–10 of 36", { exact: true }).waitFor();
  await choose(english.PAGINATION_SORT, english.SORT_PRICE_HIGH);
  await page.waitForFunction(() =>
    document
      .querySelector(".custom-table tbody tr td")
      ?.textContent?.includes("Item 34"),
  );
  await choose(english.PAGINATION_SORT, english.SORT_PRICE_LOW);
  await page.waitForFunction(() =>
    document
      .querySelector(".custom-table tbody tr td")
      ?.textContent?.includes("Item 00"),
  );
  await page
    .getByRole("combobox", { name: english.PAGINATION_SORT, exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("option", { name: english.SORT_STOCK_HIGH, exact: true })
      .count(),
    0,
  );
  await page.keyboard.press("Escape");
  await go("settings");
  await page.locator("#setting-stockManagement").check();
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();
  await page.evaluate(async (base) => {
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const stores = createDatabaseStores("POS_DEMO");
    await stores.stockOS.setCount("p0", 50);
    await stores.stockOS.setCount("p1", 5);
    (await stores.database.getDatabase()).close();
  }, base);
  await page
    .getByRole("button", { name: english.NAVBAR_MANAGE, exact: true })
    .click();
  await page
    .getByRole("link", { name: english.ITEMS_TITLE, exact: true })
    .click();
  await page.getByText("1–10 of 36", { exact: true }).waitFor();
  await choose(english.PAGINATION_SORT, english.SORT_STOCK_HIGH);
  await page.waitForFunction(() =>
    document
      .querySelector(".custom-table tbody tr td")
      ?.textContent?.includes("Item 00"),
  );
  await page.evaluate(async (base) => {
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const stores = createDatabaseStores("POS_DEMO");
    await stores.stockOS.setCount("p1", 70);
    (await stores.database.getDatabase()).close();
  }, base);
  await page.waitForFunction(() =>
    document
      .querySelector(".custom-table tbody tr td")
      ?.textContent?.includes("Item 01"),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const spacing = await page
    .getByRole("searchbox", { name: english.SEARCH_ITEMS, exact: true })
    .evaluate((input) => {
      const icon = input
        .parentElement!.querySelector("svg")!
        .getBoundingClientRect();
      return (
        input.getBoundingClientRect().left +
        parseFloat(getComputedStyle(input).paddingLeft) -
        icon.right
      );
    });
  assert.ok(spacing >= 6);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await go("contacts");
  await choose(english.PAGINATION_SORT, english.SORT_NAME_DESC);
  await page.waitForFunction(() =>
    document
      .querySelector(".custom-table tbody tr td")
      ?.textContent?.includes("Contact 34"),
  );
  await page
    .getByRole("searchbox", { name: english.SEARCH_CONTACTS })
    .fill("555-3");
  await page.getByText("1–6 of 6", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
});

test("Items prints exactly the visible page with optional stock counts", async () => {
  await go("items");
  await page.getByText("1–10 of 36", { exact: true }).waitFor();
  await page.evaluate(async (base) => {
    const settings = (await import(
      `${base}src/settings/settings.ts`
    )) as typeof import("../../src/settings/settings");
    settings.saveSettings(
      settings.toDraft({ ...settings.loadSettings(), stockManagement: true }),
    );
    const { createDatabaseStores } = (await import(
      `${base}src/database/DatabaseStores.ts`
    )) as typeof import("../../src/database/DatabaseStores");
    const stores = createDatabaseStores("POS_DEMO");
    await stores.stockOS.setCount("coffee", 12.5);
    await stores.stockOS.setCount("p0", 7);
    (await stores.database.getDatabase()).close();
  }, base);
  await page
    .getByRole("columnheader", { name: english.STOCK_IN_STOCK, exact: true })
    .waitFor();
  await context.addInitScript(() => {
    window.print = () => window.dispatchEvent(new Event("afterprint"));
  });
  await page.evaluate(() => {
    const reports: string[] = [];
    Object.defineProperty(window, "capturedItemReports", { value: reports });
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "srcdoc",
    )!;
    Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", {
      ...descriptor,
      set(this: HTMLIFrameElement, value: string) {
        reports.push(value);
        descriptor.set!.call(this, value);
      },
    });
  });
  let printed = 0;
  const printPage = async () => {
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".custom-table tbody td")].every(
        (cell) => cell.textContent?.trim() !== "…",
      ),
    );
    const expected = await page
      .locator(".custom-table tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) =>
          [...row.querySelectorAll("td")]
            .slice(
              0,
              row.querySelectorAll("th").length || row.children.length - 1,
            )
            .map((cell) => cell.textContent?.trim()),
        ),
      );
    await page
      .getByRole("button", { name: english.PRINT_ACTION, exact: true })
      .click();
    await page.waitForFunction(
      (count) =>
        (window as unknown as { capturedItemReports: string[] })
          .capturedItemReports.length > count,
      printed,
    );
    printed++;
    const result = await page.evaluate((index) => {
      const html = (window as unknown as { capturedItemReports: string[] })
        .capturedItemReports[index];
      const doc = new DOMParser().parseFromString(html, "text/html");
      return {
        title: doc.querySelector("h1")?.textContent,
        headers: [...doc.querySelectorAll("th")].map(
          (cell) => cell.textContent,
        ),
        rows: [...doc.querySelectorAll("tbody tr")].map((row) =>
          [...row.querySelectorAll("td")].map((cell) =>
            cell.textContent?.trim(),
          ),
        ),
        note: doc.body.textContent,
      };
    }, printed - 1);
    assert.deepEqual(result.rows, expected);
    return result;
  };
  await choose(english.PAGINATION_PAGE_SIZE, "25");
  await page.getByText("1–25 of 36", { exact: true }).waitFor();
  await rows(25);
  const first = await printPage();
  assert.equal(first.title, english.PRINT_STOCK_REPORT);
  assert.equal(first.rows.length, 25);
  assert.ok(first.headers.includes(english.STOCK_IN_STOCK));
  assert.ok(first.rows.some((row) => row[0] === "Coffee" && row[2] === "12.5"));
  await page
    .getByRole("button", { name: english.PAGINATION_NEXT, exact: true })
    .click();
  await page.getByText("26–36 of 36", { exact: true }).waitFor();
  assert.equal((await printPage()).rows.length, 11);
  await page
    .getByRole("searchbox", { name: english.SEARCH_ITEMS })
    .fill("Item 34");
  await page.getByText("1–1 of 1", { exact: true }).waitFor();
  assert.equal((await printPage()).rows[0][0], "Item 34");
  await page.evaluate(async (base) => {
    const settings = (await import(
      `${base}src/settings/settings.ts`
    )) as typeof import("../../src/settings/settings");
    settings.saveSettings(
      settings.toDraft({ ...settings.loadSettings(), stockManagement: false }),
    );
  }, base);
  await page
    .getByRole("columnheader", { name: english.STOCK_IN_STOCK, exact: true })
    .waitFor({ state: "hidden" });
  const noStock = await printPage();
  assert.equal(noStock.title, english.ITEMS_TITLE);
  assert.equal(noStock.headers.length, 2);
  assert.ok(!noStock.headers.includes(english.STOCK_IN_STOCK));
  await page.getByRole("searchbox", { name: english.SEARCH_ITEMS }).fill("");
  await choose(english.PAGINATION_PAGE_SIZE, english.REPORT_ALL);
  await rows(36);
  assert.equal((await printPage()).rows.length, 36);
});
