import { availablePort } from "../helpers/availablePort";
import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { chromium, Browser, BrowserContext, Page, Download } from "playwright";
import { createServer, ViteDevServer } from "vite";
import english from "../../src/data/Text_EN.json";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

let server: ViteDevServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;
let origin: string;
let base: string;
let errors: string[];

before(async () => {
  server = await createServer({
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: await availablePort(),
      strictPort: true,
    },
  });
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
  base = `${origin}${server.config.base}`;
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
    acceptDownloads: true,
  });
  // Tests are isolated and block analytics/other external requests.
  await context.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  await context.addInitScript(() => {
    localStorage.setItem("pos.welcomeSeen", "true");
    if (!sessionStorage.getItem("test.initialized")) {
      sessionStorage.setItem("pos.workspace", "demo");
      sessionStorage.setItem("test.initialized", "true");
    }
  });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator(".page-header").waitFor();
  await page.evaluate(async (modulePath) => {
    const { createDatabaseStores } = (await import(
      modulePath
    )) as typeof import("../../src/database/DatabaseStores");
    const { indexedCatalog } = (await import(
      modulePath.replace("DatabaseStores.ts", "listing/catalog.ts")
    )) as typeof import("../../src/database/listing/catalog");
    const stores = createDatabaseStores("POS_DEMO");
    const database = await stores.database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        Array.from(database.objectStoreNames),
        "readwrite",
      );
      for (const name of Array.from(database.objectStoreNames))
        transaction.objectStore(name).clear();
      transaction
        .objectStore("PRODUCTS")
        .add(indexedCatalog({ id: "product", name: "Coffee", amount: 5 }));
      const summaries = new Map<
        string,
        { id: string; count: number; total: number; timestamp: number }
      >();
      for (let i = 0; i < 12; i++)
        transaction.objectStore("CUSTOMER").add(
          indexedCatalog({
            id: `c${i}`,
            name: `Customer ${i}`,
            phoneNumber: "555-0101",
          }),
        );
      for (let i = 0; i < 35; i++) {
        const timestamp = 1700000000000 + i * 60000;
        const customerId = `c${i % 12}`;
        transaction
          .objectStore("TRANSACTIONS")
          .add({ id: `t${i}`, timestamp, total: 5 });
        transaction.objectStore("TRANSACTION_PRODUCTS").add({
          id: `row${i}`,
          transactionId: `t${i}`,
          productId: "product",
          quantity: 1,
        });
        transaction.objectStore("CUSTOMERS_TRANSACTIONS").add({
          id: `link${i}`,
          transactionId: `t${i}`,
          customerId,
          timestamp,
        });
        const summary = summaries.get(customerId) || {
          id: customerId,
          count: 0,
          total: 0,
          timestamp: 0,
        };
        summary.count++;
        summary.total += 5;
        summary.timestamp = timestamp;
        summaries.set(customerId, summary);
      }
      for (const summary of summaries.values())
        transaction.objectStore("CUSTOMER_TRANSACTION_SUMMARIES").add(summary);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, `${base}src/database/DatabaseStores.ts`);
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(
    errors,
    [],
    "The app should not emit browser JavaScript errors",
  );
});

async function go(path: string) {
  await page.goto(`${base}${path}`);
  await page.locator(".page-header").waitFor();
}
async function rowCount(count: number) {
  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll(".custom-table tbody tr").length === expected,
    count,
  );
}
async function downloadedBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  assert.ok(stream);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function downloadedJson(download: Download): Promise<unknown> {
  return JSON.parse((await downloadedBytes(download)).toString("utf8"));
}

test("pagination controls query pages and preserve list state through detail/back navigation", async () => {
  await go("transactions");
  await rowCount(10);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("11–20 of 35", { exact: true }).waitFor();
  await page.getByLabel("Per page", { exact: true }).selectOption("25");
  await rowCount(25);
  assert.equal(new URL(page.url()).searchParams.get("page"), "1");
  await page.getByLabel("Sort order", { exact: true }).selectOption("oldest");
  await page.waitForURL("**sort=oldest");
  await page.getByText("1–25 of 35", { exact: true }).waitFor();
  await page.locator(".custom-table tbody tr").first().click();
  await page.locator(".transaction-back-link").click();
  await rowCount(25);
  assert.equal(new URL(page.url()).searchParams.get("sort"), "oldest");
  assert.equal(new URL(page.url()).searchParams.get("pageSize"), "25");
});
test("customer summary, customer history, and sale detail preserve their return paths", async () => {
  await go("customers-transactions");
  await rowCount(10);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await rowCount(2);
  await page.locator(".custom-table tbody tr").first().click();
  await rowCount(3);
  await page.getByLabel("Per page", { exact: true }).selectOption("25");
  await page.getByText("1–3 of 3", { exact: true }).waitFor();
  await page.locator(".custom-table tbody tr").first().click();
  await page.locator(".transaction-back-link").click();
  await rowCount(3);
  assert.equal(new URL(page.url()).searchParams.get("pageSize"), "25");
  await page.locator(".transaction-back-link").click();
  await rowCount(2);
  assert.equal(new URL(page.url()).searchParams.get("page"), "2");
});
test("mobile navigation, populated cards, and dialogs fit narrow phone and tablet widths", async () => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "",
      "items",
      "customers",
      "transactions",
      "customers-transactions",
      "price-history",
      "settings",
    ]) {
      await go(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(
        overflow,
        false,
        `No page overflow at ${width}px on ${path}`,
      );
    }
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    await page.getByRole("link", { name: "Items", exact: true }).click();
    await page.locator("#main-navigation-links").waitFor({ state: "hidden" });
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await go("items");
  await page.getByRole("button", { name: "Add an item", exact: true }).click();
  const bounds = await page.getByRole("dialog").boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 321);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const edit = await page
    .getByRole("button", { name: "Edit Coffee", exact: true })
    .boundingBox();
  assert.ok(edit && edit.x >= 0 && edit.x + edit.width <= 321);
});
test("item and customer edit dialogs persist changes and price history preserves old sales", async () => {
  await go("items");
  await page.getByRole("button", { name: "Edit Coffee", exact: true }).click();
  await page.getByLabel("Item name", { exact: true }).fill("Espresso");
  await page.getByLabel("Current price", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Espresso", exact: true })
    .waitFor();
  await go("price-history");
  await rowCount(1);
  await page.getByRole("cell", { name: "Espresso", exact: true }).waitFor();
  await page.getByRole("cell", { name: "$7.00", exact: true }).waitFor();
  await go("transaction?id=t0");
  await page
    .locator(".transaction-details")
    .getByText("$5.00", { exact: true })
    .waitFor();
  await go("customers");
  await page
    .getByRole("button", { name: "Edit Customer 0", exact: true })
    .click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Updated Customer");
  await page.getByLabel("Phone number", { exact: true }).fill("555-0199");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Updated Customer", exact: true })
    .waitFor();
});
test("discount dialog applies a percentage and a flat deduction and posts the resulting sale", async () => {
  await go("");
  await page
    .getByRole("button", { name: "Add your first item", exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page.getByRole("button", { name: "Discount", exact: true }).click();
  await page.getByLabel("Discount percentage", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Apply Discount", exact: true })
    .click();
  await page
    .locator(".transaction-details")
    .getByText("$4.50", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Discount", exact: true }).click();
  await page.getByLabel("Discount type", { exact: true }).selectOption("0");
  await page.getByLabel("Discount amount", { exact: true }).fill("1.25");
  await page
    .getByRole("button", { name: "Apply Discount", exact: true })
    .click();
  await page
    .locator(".transaction-details")
    .getByText("$3.25", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.BUTTON_POST_TRANSACTION, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add your first item", exact: true })
    .waitFor();
  await go("transactions");
  await rowCount(10);
  await page
    .locator(".custom-table tbody tr")
    .first()
    .getByText("$3.25", { exact: true })
    .waitFor();
});
test("settings download the English template, accept custom text, and persist Nepali fallback", async () => {
  await go("settings");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Text_EN.json", exact: true })
    .click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), "Text_EN.json");
  assert.deepEqual(await downloadedJson(download), english);
  await page.getByLabel("Choose a custom locale JSON file").setInputFiles({
    name: "custom.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ NAVBAR_SETTINGS: "Preferences Test" }),
    ),
  });
  await page
    .getByRole("option", { name: "Custom", exact: true })
    .waitFor({ state: "attached" });
  await page
    .getByLabel("Display language", { exact: true })
    .selectOption("custom");
  await page
    .getByRole("link", { name: "Preferences Test", exact: true })
    .waitFor();
  await page
    .getByLabel("Display language", { exact: true })
    .selectOption("nepali");
  await page.reload();
  assert.equal(
    await page.getByLabel("Display language", { exact: true }).inputValue(),
    "nepali",
  );
  await page.getByRole("link", { name: "Settings", exact: true }).waitFor();
});
test("backup controls download the full database and restore a reviewed file", async () => {
  await go("settings");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: english.UI_DOWNLOAD_FULL_BACKUP, exact: true })
    .click();
  const download = await pending;
  assert.match(download.suggestedFilename(), /\.zip$/);
  const files = unzipSync(await downloadedBytes(download));
  const manifest = JSON.parse(strFromU8(files["manifest.json"])) as {
    tables: Record<string, { file: string; count: number }[]>;
  };
  assert.equal(
    manifest.tables.TRANSACTIONS.reduce((count, part) => count + part.count, 0),
    35,
  );
  const productPath = manifest.tables.PRODUCTS[0].file;
  const products = JSON.parse(strFromU8(files[productPath])) as {
    name: string;
  }[];
  products[0].name = "Restored Coffee";
  files[productPath] = strToU8(JSON.stringify(products));
  await page
    .getByLabel("Choose database backup", { exact: true })
    .setInputFiles({
      name: "backup.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(zipSync(files)),
    });
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await page
    .getByRole("button", { name: "Replace demo workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Reload app", exact: true }).waitFor();
  await go("items");
  await page
    .getByRole("button", { name: "Edit Restored Coffee", exact: true })
    .waitFor();
});

test("settings switch back to the existing demo without resetting practice records", async () => {
  await go("settings");
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByRole("button", {
        name: english.UI_USE_MY_REAL_WORKSPACE,
        exact: true,
      })
      .click(),
  ]);
  await page
    .getByRole("button", { name: "Switch to Demo", exact: true })
    .waitFor();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Switch to Demo", exact: true }).click(),
  ]);
  await page.locator(".demo-banner").waitFor();
  await go("transactions");
  await rowCount(10);
  await page.getByText("1–10 of 35", { exact: true }).waitFor();
});

test("fresh demo populates catalog, customer summaries, sale history, and price history", async () => {
  await go("settings");
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByRole("button", { name: english.UI_RESTART_DEMO, exact: true })
      .click(),
  ]);
  await go("transactions");
  await rowCount(10);
  await page.getByText("1–10 of 24", { exact: true }).waitFor();
  await go("customers-transactions");
  await rowCount(3);
  await page.locator(".custom-table tbody tr").first().click();
  await rowCount(6);
  await go("price-history");
  await rowCount(6);
  await go("items");
  await rowCount(6);
  await go("customers");
  await rowCount(3);
  await go("transaction?id=demo-sale-1");
  await page
    .locator(".transaction-details")
    .getByText("$11.25", { exact: true })
    .waitFor();
});

test("install settings use the browser install prompt and theme metadata follows saved appearance", async () => {
  await go("settings");
  await page.evaluate(() => {
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt"), {
        prompt() {
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      }),
    );
  });
  await page
    .getByRole("button", { name: english.PWA_INSTALL_ACTION, exact: true })
    .click();
  await page
    .getByText(english.PWA_INSTALL_DISMISSED, { exact: true })
    .waitFor();
  await page.getByRole("switch").check();
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content") === "#262626",
  );
});

test("development installs expose a real manifest and correctly scoped Apple icon URLs", async () => {
  await go("settings");
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  assert.equal(
    new URL(manifestHref!, base).href,
    `${base}manifest.webmanifest`,
  );
  const manifestResponse = await context.request.get(
    `${base}manifest.webmanifest`,
  );
  const contentType = manifestResponse.headers()["content-type"];
  assert.ok(contentType.includes("application/manifest+json"));
  assert.equal(manifestResponse.headers()["cache-control"], "no-store");
  assert.equal((await manifestResponse.json()).name, english.PWA_APP_NAME);
  for (const selector of [
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"][type="image/png"]',
    'link[rel="apple-touch-startup-image"]',
  ]) {
    const href = await page.locator(selector).first().getAttribute("href");
    const url = new URL(href!, base);
    const expected = new URL(base);
    assert.equal(
      url.pathname.startsWith(
        `${expected.pathname}${expected.pathname.slice(1)}`,
      ) && expected.pathname !== "/",
      false,
      `No doubled base path: ${url.pathname}`,
    );
    const response = await context.request.get(url.href);
    assert.equal(response.ok(), true);
    assert.ok(
      response.headers()["content-type"].startsWith("image/png"),
      `Image URL must return PNG rather than an HTML fallback: ${url.href}`,
    );
  }
});

test("quantity uses a validated dialog and notification pills pause on hover then disappear", async () => {
  await page.clock.install();
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await go("");
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page
    .getByRole("button", { name: english.BUTTON_CHANGE_QUANTITY, exact: true })
    .click();
  await page.getByLabel(english.QUANTITY_LABEL, { exact: true }).fill("0");
  await page
    .getByRole("button", { name: english.QUANTITY_APPLY, exact: true })
    .click();
  await page.getByText(english.QUANTITY_INVALID, { exact: true }).waitFor();
  await page.getByLabel(english.QUANTITY_LABEL, { exact: true }).fill("3");
  await page
    .getByRole("button", { name: english.QUANTITY_APPLY, exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".transaction-details")
    .getByText("$15.00", { exact: true })
    .waitFor();
  const pill = page.locator(".notification-pill");
  await pill.waitFor();
  await pill.hover();
  await page.clock.runFor(5000);
  assert.equal(await pill.isVisible(), true);
  await page.mouse.move(0, 0);
  await page.clock.runFor(4600);
  await pill.waitFor({ state: "hidden" });
  assert.deepEqual(dialogs, []);
});

test("posting a sale displays an automatic success notification without native alerts", async () => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await go("");
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page
    .getByRole("button", { name: english.BUTTON_POST_TRANSACTION, exact: true })
    .click();
  await page
    .locator(".notification-message")
    .getByText(english.NOTIFICATION_POSTED, { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .waitFor();
  assert.deepEqual(dialogs, []);
});

test("customer linking reports success without a blocking alert", async () => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await go("");
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page
    .getByRole("button", { name: english.BUTTON_ADD_TO_CUSTOMER, exact: true })
    .click();
  await page.getByRole("searchbox").fill("Customer 0");
  await page
    .locator(".modal-item")
    .filter({ hasText: /^Customer 0/ })
    .click();
  await page
    .locator(".notification-message")
    .filter({ hasText: "Customer 0" })
    .waitFor();
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .waitFor();
  assert.deepEqual(dialogs, []);
});

test("a failed customer link preserves the saved sale and retries without posting it twice", async () => {
  await go("");
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  const moduleUrl = `${base}src/database/CustomersTransactionsOS.ts`;
  await page.evaluate(`import(${JSON.stringify(moduleUrl)}).then(module => {
    const original = module.default.prototype.addOne;
    let attempts = 0;
    module.default.prototype.addOne = function(...args) {
      if (attempts++ === 0) return Promise.reject(new Error('Simulated link failure'));
      return original.apply(this, args);
    };
  })`);
  await page
    .getByRole("button", { name: english.BUTTON_ADD_TO_CUSTOMER, exact: true })
    .click();
  await page.getByRole("searchbox").fill("Customer 0");
  await page
    .locator(".modal-item")
    .filter({ hasText: /^Customer 0/ })
    .click();
  await page.getByText("Simulated link failure", { exact: true }).waitFor();
  await page
    .locator(".transaction-details")
    .getByText("$5.00", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.BUTTON_ADD_TO_CUSTOMER, exact: true })
    .click();
  await page.getByRole("searchbox").fill("Customer 0");
  await page
    .locator(".modal-item")
    .filter({ hasText: /^Customer 0/ })
    .click();
  await page
    .locator(".notification-message")
    .filter({ hasText: "Customer 0" })
    .waitFor();
  await go("transactions");
  await page.getByText("1–10 of 36", { exact: true }).waitFor();
});
