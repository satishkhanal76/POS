import { englishMessages } from "../../src/localization/messages";
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
  await page.locator(".page-header:visible").waitFor();
  await page.evaluate(async (modulePath) => {
    const { createDatabaseStores } = (await import(
      modulePath
    )) as typeof import("../../src/database/DatabaseStores");
    const { indexedCatalog } = (await import(
      modulePath.replace("DatabaseStores.ts", "listing/catalog.ts")
    )) as typeof import("../../src/database/listing/catalog");
    const { indexedHeader, indexedLink, indexedSummary } = (await import(
      modulePath.replace("DatabaseStores.ts", "listing/metadata.ts")
    )) as typeof import("../../src/database/listing/metadata");
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
          .add(
            indexedHeader(
              { id: `t${i}`, timestamp, total: 5 },
              "sale",
              [customerId],
              1,
            ),
          );
        transaction.objectStore("TRANSACTION_PRODUCTS").add({
          id: `row${i}`,
          transactionId: `t${i}`,
          productId: "product",
          quantity: 1,
        });
        transaction.objectStore("CUSTOMERS_TRANSACTIONS").add(
          indexedLink({
            id: `link${i}`,
            transactionId: `t${i}`,
            customerId,
            timestamp,
          }),
        );
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
        transaction
          .objectStore("CUSTOMER_TRANSACTION_SUMMARIES")
          .add(indexedSummary(summary));
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
  await page.locator(".page-header:visible").waitFor();
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

test("Sales and Purchases use saved filter and sort defaults unless the URL overrides them", async () => {
  const period = page.getByRole("combobox", {
    name: english.DASH_PERIOD,
    exact: true,
  });
  for (const path of ["transactions", "purchases"]) {
    await go(path);
    await period.getByText(english.DASH_MONTH, { exact: true }).waitFor();
  }

  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_HISTORY })
    .click();
  assert.equal(await page.locator(".settings-subcategory[open]").count(), 0);
  await page
    .locator(".settings-subcategory > summary")
    .filter({ hasText: english.SETTINGS_HISTORY_FILTERS })
    .click();
  const history = page.getByRole("region", {
    name: english.SETTINGS_HISTORY_FILTERS,
    exact: true,
  });
  const preset = history.getByRole("combobox", {
    name: english.SETTINGS_HISTORY_PERIOD,
    exact: true,
  });
  await preset.press("Enter");
  assert.equal(
    await page
      .getByRole("option", { name: english.DASH_CUSTOM, exact: true })
      .count(),
    0,
  );
  await preset.press("End");
  await preset.press("Enter");
  for (const name of [
    english.SETTINGS_HISTORY_PAGE_SIZE,
    english.SETTINGS_SALES_SORT,
    english.SETTINGS_SALES_FILTER,
    english.SETTINGS_PURCHASE_SORT,
    english.SETTINGS_PURCHASE_FILTER,
  ]) {
    const select = history.getByRole("combobox", { name, exact: true });
    await select.press("Enter");
    await select.press("End");
    await select.press("Enter");
  }
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();

  const sort = page.getByRole("combobox", {
    name: english.PAGINATION_SORT,
    exact: true,
  });
  const filter = page.getByRole("combobox", {
    name: english.FILTER_TYPE,
    exact: true,
  });
  const size = page.getByRole("combobox", {
    name: english.PAGINATION_PAGE_SIZE,
    exact: true,
  });
  for (const [path, sortLabel, filterLabel, prefix] of [
    ["transactions", english.SORT_ITEMS_LOW, english.REPORT_PAYMENTS, ""],
    ["purchases", english.SORT_TOTAL_LOW, english.BUY_PAYMENTS, "purchasing-"],
  ]) {
    await go(path);
    await period.getByText(english.REPORT_ALL_TIME, { exact: true }).waitFor();
    await sort.getByText(sortLabel, { exact: true }).waitFor();
    await filter.getByText(filterLabel, { exact: true }).waitFor();
    await size.getByText("100", { exact: true }).waitFor();
    await go(
      `${path}?period=custom&date=2023-11-01&end=2023-11-30&${prefix}kind=all&${prefix}sort=oldest&${prefix}pageSize=25`,
    );
    await period.getByText(english.DASH_CUSTOM, { exact: true }).waitFor();
    await sort.getByText(english.PAGINATION_OLDEST, { exact: true }).waitFor();
    await filter.getByText(english.FILTER_ALL_TYPES, { exact: true }).waitFor();
    await size.getByText("25", { exact: true }).waitFor();
  }
});

test("Dashboard and Overview keep independent report defaults", async () => {
  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_HISTORY })
    .click();
  assert.equal(await page.locator(".settings-subcategory[open]").count(), 0);
  for (const title of [english.REPORT_DASHBOARD, english.REPORT_OVERVIEW]) {
    await page
      .locator(".settings-subcategory > summary")
      .filter({ hasText: title })
      .click();
  }
  const dashboard = page.getByRole("region", {
    name: english.REPORT_DASHBOARD,
    exact: true,
  });
  const overview = page.getByRole("region", {
    name: english.REPORT_OVERVIEW,
    exact: true,
  });

  for (const [group, label] of [
    [dashboard, english.DASH_DAY],
    [overview, english.DASH_MONTH],
  ] as const) {
    const period = group.getByRole("combobox", {
      name: english.SETTINGS_HISTORY_PERIOD,
      exact: true,
    });
    await period.getByText(label, { exact: true }).waitFor();
    await period.press("Enter");
    assert.equal(
      await page
        .getByRole("option", { name: english.DASH_CUSTOM, exact: true })
        .count(),
      0,
    );
    await period.press("Escape");
  }
  const period = dashboard.getByRole("combobox", {
    name: english.SETTINGS_HISTORY_PERIOD,
    exact: true,
  });
  await period.press("Enter");
  await period.press("End");
  await period.press("Enter");
  await period.getByText(english.REPORT_ALL_TIME, { exact: true }).waitFor();
  const size = dashboard.getByRole("combobox", {
    name: english.SETTINGS_HISTORY_PAGE_SIZE,
    exact: true,
  });
  await size.press("Enter");
  await size.press("End");
  await size.press("Enter");
  await dashboard
    .getByRole("switch", { name: english.SETTINGS_REPORT_COLLAPSED })
    .press("Space");
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();

  const reportPeriod = page.getByRole("combobox", {
    name: english.DASH_PERIOD,
    exact: true,
  });
  await go("dashboard");
  await reportPeriod
    .getByText(english.REPORT_ALL_TIME, { exact: true })
    .waitFor();
  const sales = page.locator(".report-disclosure").filter({
    has: page
      .locator("summary")
      .getByText(english.REPORT_TRANSACTIONS, { exact: true }),
  });
  assert.equal(await sales.getAttribute("open"), "");
  await sales
    .getByRole("combobox", { name: english.PAGINATION_PAGE_SIZE, exact: true })
    .getByText("100", { exact: true })
    .waitFor();
  await sales.locator("summary").click();
  assert.equal(await sales.getAttribute("open"), null);

  await go("overview");
  await reportPeriod.getByText(english.DASH_MONTH, { exact: true }).waitFor();
  await page.locator(".report-disclosure").first().waitFor();
  assert.equal(await page.locator(".report-disclosure[open]").count(), 0);
});

test("pagination controls query pages and preserve list state through detail/back navigation", async () => {
  await go("transactions?period=all");
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
test("contacts, combined contact history, and sale detail preserve their return paths", async () => {
  await go("contacts");
  await rowCount(10);
  await page
    .getByRole("button", { name: english.PAGINATION_NEXT, exact: true })
    .click();
  await rowCount(2);
  await page.locator(".custom-table tbody tr").first().click();
  const sales = page.locator("#transactions");
  await sales.getByText("1–3 of 3", { exact: true }).waitFor();
  await sales
    .getByRole("combobox", { name: english.PAGINATION_PAGE_SIZE, exact: true })
    .click();
  await page.getByRole("option", { name: "25", exact: true }).click();
  await sales.getByText("1–3 of 3", { exact: true }).waitFor();
  await sales.locator("tbody tr").first().click();
  await page
    .getByRole("link", { name: english.CONTACT_BACK_ACCOUNT, exact: true })
    .click();
  await sales.getByText("1–3 of 3", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("sales-pageSize"), "25");
  await page.locator(".page-back-link").first().click();
  await rowCount(2);
  assert.equal(new URL(page.url()).searchParams.get("contacts-page"), "2");
});
test("mobile navigation, populated cards, and dialogs fit narrow phone and tablet widths", async () => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "",
      "items",
      "customers",
      "transactions",
      "contact?id=c0",
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
  await go("transactions?period=all");
  await rowCount(10);
  await page
    .locator(".custom-table tbody tr")
    .first()
    .getByText("$3.25", { exact: true })
    .waitFor();
});
test("settings download the English template, accept custom text, and persist Nepali fallback", async () => {
  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_LANGUAGE })
    .click();
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
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_WORKSPACE_DATA })
    .click();
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

test("folder backups write only changes and recover after local workspace loss", async () => {
  // Use real writable handles and IndexedDB serialization, with an isolated
  // browser-private test directory standing in for the native folder picker.
  const openBackups = async () => {
    await go("settings");
    await page.evaluate(`(() => {
      Object.defineProperty(window, "showDirectoryPicker", {
        configurable: true,
        value: async () => {
          const root = await navigator.storage.getDirectory();
          return root.getDirectoryHandle("folder-backup-test", {
            create: true,
          });
        },
      });
    })()`);
    await page
      .locator(".settings-category > summary")
      .filter({ hasText: english.SETTINGS_WORKSPACE_DATA })
      .click();
  };
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await openBackups();
  await button(english.FOLDER_BACKUP_CHOOSE).click();
  await button(english.FOLDER_BACKUP_NOW).waitFor();
  await go("items");
  await button("Edit Coffee").click();
  await page.getByLabel("Item name", { exact: true }).fill("Folder Coffee");
  await button(english.UI_SAVE_CHANGES).click();
  await button("Edit Folder Coffee").waitFor();

  await openBackups();
  await button(english.FOLDER_BACKUP_NOW).click();
  await page.waitForFunction(
    (name) =>
      [...document.querySelectorAll("button")].some(
        (button) => button.textContent === name && !button.disabled,
      ),
    english.FOLDER_BACKUP_NOW,
  );
  const folderStatus = page.locator(".backup-preview [role=status]");
  assert.equal(
    await folderStatus.count(),
    0,
    await folderStatus.allTextContents().then((messages) => messages.join(" ")),
  );
  const delta = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle("folder-backup-test");
    const handle = await folder.getFileHandle("pos-change-00000001.json");
    return JSON.parse(await (await handle.getFile()).text());
  });
  assert.deepEqual(Object.keys(delta.tables), ["PRODUCTS"]);
  assert.equal(delta.tables.PRODUCTS.upserts[0].name, "Folder Coffee");

  await page.evaluate(`(async (moduleUrl) => {
    const { createDatabaseStores } = (await import(
      moduleUrl
    ));
    async function clear(db) {
      await new Promise((resolve, reject) => {
        const names = Array.from(db.objectStoreNames);
        const tx = db.transaction(names, "readwrite");
        for (const name of names) tx.objectStore(name).clear();
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
    }
    await clear(await createDatabaseStores("POS_DEMO").database.getDatabase());
    const request = indexedDB.open("POS_FOLDER_BACKUP_SETTINGS");
    const preferences = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await clear(preferences);
    preferences.close();
  })(${JSON.stringify(base + "src/database/DatabaseStores.ts")})`);

  await openBackups();
  await button(english.FOLDER_BACKUP_RECOVER).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await button("Replace demo workspace").click();
  await button(english.UI_RELOAD_APP).waitFor();
  await go("items");
  await button("Edit Folder Coffee").waitFor();
});

test("settings switch back to the existing demo without resetting practice records", async () => {
  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_WORKSPACE_DATA })
    .click();
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
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_WORKSPACE_DATA })
    .click();
  await page
    .getByRole("button", { name: "Switch to Demo", exact: true })
    .waitFor();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Switch to Demo", exact: true }).click(),
  ]);
  await page.locator(".demo-banner").waitFor();
  await go("transactions?period=all");
  await rowCount(10);
  await page.getByText("1–10 of 35", { exact: true }).waitFor();
});

test("fresh demo populates catalog, customer summaries, sale history, and price history", async () => {
  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_WORKSPACE_DATA })
    .click();
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await Promise.all([
    page.waitForEvent("load"),
    page
      .getByRole("button", { name: english.UI_RESTART_DEMO, exact: true })
      .click(),
  ]);
  await go("transactions?period=all");
  await rowCount(10);
  await page.getByText("1–10 of 24", { exact: true }).waitFor();
  await go("contacts");
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
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_INSTALLATION })
    .click();
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
    .getByRole("button", {
      name: englishMessages.PWA_INSTALL_ACTION,
      exact: true,
    })
    .click();
  await page
    .getByText(english.PWA_INSTALL_DISMISSED, { exact: true })
    .waitFor();
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_DISPLAY })
    .click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => document.documentElement.dataset.appTheme === "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => document.documentElement.dataset.appTheme === "light",
  );
  const theme = page.getByRole("combobox", {
    name: english.SETTINGS_THEME,
    exact: true,
  });
  await theme.press("Enter");
  await theme.press("End");
  await theme.press("Enter");
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
  assert.equal(
    (await manifestResponse.json()).name,
    englishMessages.PWA_APP_NAME,
  );
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

test("empty POS pickers can create records and return to the order", async () => {
  await page.evaluate(async (moduleUrl) => {
    const { createDatabaseStores } = (await import(
      moduleUrl
    )) as typeof import("../../src/database/DatabaseStores");
    const db = await createDatabaseStores("POS_DEMO").database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["PRODUCTS", "CUSTOMER"], "readwrite");
      transaction.objectStore("PRODUCTS").clear();
      transaction.objectStore("CUSTOMER").clear();
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }, `${base}src/database/DatabaseStores.ts`);
  await go("");

  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await button(english.UI_ADD_YOUR_FIRST_ITEM).click();
  await button(english.ITEM_FORM_TITLE).click();
  await page
    .getByLabel(english.INPUT_ITEM_NAME_LABEL, { exact: true })
    .fill("New Item");
  await page
    .getByLabel(english.INPUT_ITEM_PRICE_LABEL, { exact: true })
    .fill("4");
  await button(english.INPUT_FORM_SUBMIT_BUTTON).click();
  await page.locator(".modal-item").filter({ hasText: "New Item" }).click();

  await button(english.BUTTON_ADD_TO_CUSTOMER).click();
  await button(english.CUSTOMER_FORM_TITLE).click();
  await page
    .getByLabel(english.INPUT_CUSTOMER_NAME_LABEL, { exact: true })
    .fill("New Contact");
  await button(english.UI_SAVE_CHANGES).click();
  await page.locator(".modal-item").filter({ hasText: "New Contact" }).click();
  await page
    .locator(".sale-order-customer")
    .getByText("Customer: New Contact")
    .waitFor();
  await page
    .locator(".transaction-details")
    .getByText("$4.00", { exact: true })
    .waitFor();
});

test("compact POS offers order shortcuts on a phone-sized viewport", async () => {
  const workspace = page.locator(".pos-workspace:visible");
  assert.equal(await workspace.locator(".pos-shortcut").count(), 0);

  await page.setViewportSize({ width: 375, height: 700 });
  await go("");
  await workspace.locator(".pos-shortcut").first().waitFor();

  assert.equal(await page.locator("[data-compact-views]").count(), 0);
  const order = workspace.locator(".pos-order");
  const shortcut = (name: string) =>
    order.getByRole("button", { name, exact: true });
  await shortcut(english.PAYMENT_RECORD).click();
  await page.getByLabel(english.PAYMENT_AMOUNT, { exact: true }).fill("2");
  await page
    .getByRole("button", { name: english.PAYMENT_CONTINUE, exact: true })
    .click();
  assert.equal(await shortcut(english.BUTTON_POST_TRANSACTION).count(), 0);
  await shortcut(english.BUTTON_ADD_TO_CUSTOMER).click();
  await page.getByRole("searchbox").fill("Customer 0");
  await page
    .locator(".modal-item")
    .filter({ hasText: /^Customer 0/ })
    .click();
  await order
    .locator(".sale-order-customer")
    .getByText("Customer: Customer 0")
    .waitFor();
  await shortcut(english.BUTTON_POST_TRANSACTION).click();
  await page
    .locator(".notification-message")
    .getByText("Customer payment recorded for Customer 0.", { exact: true })
    .waitFor();
  await shortcut(english.UI_ADD_YOUR_FIRST_ITEM).click();
  await page.locator(".modal-item").first().click();

  assert.equal(await shortcut(english.BUTTON_ADD).isEnabled(), true);
  assert.equal(await shortcut(english.BUTTON_DISCOUNT).isEnabled(), true);
  assert.equal(
    await shortcut(english.BUTTON_VOID_TRANSACTION).isEnabled(),
    true,
  );
  await order.locator("button.quantity").click();
  await page.getByLabel(english.QUANTITY_LABEL, { exact: true }).fill("3");
  await page
    .getByRole("button", { name: english.QUANTITY_APPLY, exact: true })
    .click();
  await order
    .locator(".transaction-details")
    .getByText("$15.00", { exact: true })
    .waitFor();
  assert.equal(
    await shortcut(english.BUTTON_ADD_TO_CUSTOMER).isEnabled(),
    true,
  );
  assert.equal(
    await workspace
      .locator(".pos-actions-panel")
      .getByRole("button", {
        name: english.BUTTON_POST_TRANSACTION,
        exact: true,
      })
      .isEnabled(),
    true,
  );
  await order.locator(".pos-compact-line .pos-shortcut").click();
  await shortcut(english.PAYMENT_RECORD).waitFor();

  await go("settings");
  assert.equal(await page.locator(".settings-category[open]").count(), 0);
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_DISPLAY })
    .click();
  await page
    .getByRole("switch", { name: english.SETTINGS_COMPACT_OTHER_VIEWS })
    .press("Space");
  await page
    .getByRole("switch", { name: english.SETTINGS_SHOW_ORDER_ACTIONS })
    .press("Space");
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();
  await go("");
  assert.equal(await workspace.locator(".pos-actions-panel").count(), 0);
  assert.equal(await page.locator("[data-compact-views]").count(), 1);

  await shortcut(english.UI_ADD_YOUR_FIRST_ITEM).click();
  await page.locator(".modal-item").first().click();
  await shortcut(english.BUTTON_POST_TRANSACTION).click();
  await shortcut(english.PAYMENT_RECORD).waitFor();
  await go("settings");
  await page
    .locator(".settings-category > summary")
    .filter({ hasText: english.SETTINGS_DISPLAY })
    .click();
  await page
    .getByRole("switch", { name: english.SETTINGS_COMPACT_UI })
    .press("Space");
  await page
    .getByRole("button", { name: english.UI_SAVE_CHANGES_2, exact: true })
    .click();
  await go("");
  assert.equal(await workspace.locator(".pos-shortcut").count(), 0);
  assert.equal(await workspace.locator(".pos-actions-panel").count(), 1);
  assert.equal(await page.locator("[data-compact-views]").count(), 0);
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

test("linking a customer keeps the order editable until posting", async () => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await go("");
  await page
    .getByRole("button", { name: english.BUTTON_ADD_TO_CUSTOMER, exact: true })
    .click();
  await page.getByRole("searchbox").fill("Customer 0");
  await page
    .locator(".modal-item")
    .filter({ hasText: /^Customer 0/ })
    .click();
  await page
    .locator(".sale-order-customer")
    .getByText("Customer: Customer 0")
    .waitFor();
  await page
    .getByRole("button", { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page
    .getByRole("button", { name: english.BUTTON_ADD, exact: true })
    .click();
  await page.locator(".modal-item").first().click();
  await page
    .locator(".transaction-details")
    .getByText("$10.00", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.BUTTON_POST_TRANSACTION, exact: true })
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

test("a customer removed before posting leaves the sale draft available to retry", async () => {
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
  await page.locator(".sale-order-customer").waitFor();

  await page.evaluate(async (moduleUrl) => {
    const { createDatabaseStores } = (await import(
      moduleUrl
    )) as typeof import("../../src/database/DatabaseStores");
    const db = await createDatabaseStores("POS_DEMO").database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("CUSTOMER", "readwrite");
      transaction.objectStore("CUSTOMER").delete("c0");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }, `${base}src/database/DatabaseStores.ts`);

  const post = page.getByRole("button", {
    name: english.BUTTON_POST_TRANSACTION,
    exact: true,
  });
  await post.click();
  await page
    .locator(".notification-message")
    .getByText(english.PAGINATION_CUSTOMER_MISSING, { exact: true })
    .waitFor();
  await page
    .locator(".transaction-details")
    .getByText("$5.00", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: english.UNLINK_ACTION, exact: true })
    .click();
  await post.click();
  await page
    .locator(".notification-message")
    .getByText(english.NOTIFICATION_POSTED, { exact: true })
    .waitFor();
  await go("transactions?period=all");
  await page.getByText("1–10 of 36", { exact: true }).waitFor();
});
