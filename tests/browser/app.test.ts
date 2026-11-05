import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, Browser, BrowserContext, Page, Download } from 'playwright';
import { createServer, ViteDevServer } from 'vite';
import english from '../../src/data/Text_EN.json';
import { DatabaseBackup } from '../../src/database/DatabaseBackup';

let server: ViteDevServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;
let origin: string;
let base: string;
let errors: string[];

before(async () => {
  server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, strictPort: true } });
  await server.listen();
  const address = server.httpServer!.address();
  assert.ok(address && typeof address !== 'string');
  origin = `http://127.0.0.1:${address.port}`;
  base = `${origin}${server.config.base}`;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});
after(async () => { await browser?.close(); await server?.close(); });
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  // Tests are isolated and block analytics/other external requests.
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await context.addInitScript(() => {
    localStorage.setItem('pos.welcomeSeen', 'true');
    if (!sessionStorage.getItem('test.initialized')) {
      sessionStorage.setItem('pos.workspace', 'demo');
      sessionStorage.setItem('test.initialized', 'true');
    }
  });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.locator('.page-header').waitFor();
  await page.evaluate(async modulePath => {
    const { createDatabaseStores } = await import(modulePath) as typeof import('../../src/database/DatabaseStores');
    const stores = createDatabaseStores('POS_DEMO');
    const database = await stores.database.getDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(Array.from(database.objectStoreNames), 'readwrite');
      for (const name of Array.from(database.objectStoreNames)) transaction.objectStore(name).clear();
      transaction.objectStore('PRODUCTS').add({ id: 'product', name: 'Coffee', amount: 5 });
      const summaries = new Map<string, { id: string; count: number; total: number; timestamp: number }>();
      for (let i = 0; i < 12; i++) transaction.objectStore('CUSTOMER').add({ id: `c${i}`, name: `Customer ${i}`, phoneNumber: '555-0101' });
      for (let i = 0; i < 35; i++) {
        const timestamp = 1700000000000 + i * 60000;
        const customerId = `c${i % 12}`;
        transaction.objectStore('TRANSACTIONS').add({ id: `t${i}`, timestamp, total: 5 });
        transaction.objectStore('TRANSACTION_PRODUCTS').add({ id: `row${i}`, transactionId: `t${i}`, productId: 'product', quantity: 1 });
        transaction.objectStore('CUSTOMERS_TRANSACTIONS').add({ id: `link${i}`, transactionId: `t${i}`, customerId, timestamp });
        const summary = summaries.get(customerId) || { id: customerId, count: 0, total: 0, timestamp: 0 };
        summary.count++; summary.total += 5; summary.timestamp = timestamp;
        summaries.set(customerId, summary);
      }
      for (const summary of summaries.values()) transaction.objectStore('CUSTOMER_TRANSACTION_SUMMARIES').add(summary);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, `${base}src/database/DatabaseStores.ts`);
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], 'The app should not emit browser JavaScript errors');
});

async function go(path: string) { await page.goto(`${base}${path}`); await page.locator('.page-header').waitFor(); }
async function rowCount(count: number) {
  await page.waitForFunction(expected => document.querySelectorAll('.custom-table tbody tr').length === expected, count);
}
async function downloadedJson(download: Download): Promise<unknown> {
  const stream = await download.createReadStream();
  assert.ok(stream);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

test('pagination controls query pages and preserve list state through detail/back navigation', async () => {
  await go('transactions'); await rowCount(10);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('11–20 of 35', { exact: true }).waitFor();
  await page.getByLabel('Per page', { exact: true }).selectOption('25'); await rowCount(25);
  assert.equal(new URL(page.url()).searchParams.get('page'), '1');
  await page.getByLabel('Sort order', { exact: true }).selectOption('oldest');
  await page.waitForURL('**sort=oldest');
  await page.getByText('1–25 of 35', { exact: true }).waitFor();
  await page.locator('.custom-table tbody tr').first().click();
  await page.locator('.transaction-back-link').click(); await rowCount(25);
  assert.equal(new URL(page.url()).searchParams.get('sort'), 'oldest');
  assert.equal(new URL(page.url()).searchParams.get('pageSize'), '25');
});
test('customer summary, customer history, and sale detail preserve their return paths', async () => {
  await go('customers-transactions'); await rowCount(10);
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await rowCount(2);
  await page.locator('.custom-table tbody tr').first().click(); await rowCount(3);
  await page.getByLabel('Per page', { exact: true }).selectOption('25');
  await page.getByText('1–3 of 3', { exact: true }).waitFor();
  await page.locator('.custom-table tbody tr').first().click();
  await page.locator('.transaction-back-link').click(); await rowCount(3);
  assert.equal(new URL(page.url()).searchParams.get('pageSize'), '25');
  await page.locator('.transaction-back-link').click(); await rowCount(2);
  assert.equal(new URL(page.url()).searchParams.get('page'), '2');
});
test('mobile navigation, populated cards, and dialogs fit narrow phone and tablet widths', async () => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['', 'items', 'customers', 'transactions', 'customers-transactions', 'price-history', 'settings']) {
      await go(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `No page overflow at ${width}px on ${path}`);
    }
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('button', { name: 'Manage', exact: true }).click();
    await page.getByRole('link', { name: 'Items', exact: true }).click();
    await page.locator('#main-navigation-links').waitFor({ state: 'hidden' });
  }
  await page.setViewportSize({ width: 320, height: 700 }); await go('items');
  await page.getByRole('button', { name: 'Add an item', exact: true }).click();
  const bounds = await page.getByRole('dialog').boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 321);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const edit = await page.getByRole('button', { name: 'Edit Coffee', exact: true }).boundingBox();
  assert.ok(edit && edit.x >= 0 && edit.x + edit.width <= 321);
});
test('item and customer edit dialogs persist changes and price history preserves old sales', async () => {
  await go('items'); await page.getByRole('button', { name: 'Edit Coffee', exact: true }).click();
  await page.getByLabel('Item name', { exact: true }).fill('Espresso');
  await page.getByLabel('Current price', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Espresso', exact: true }).waitFor();
  await go('price-history'); await rowCount(1);
  await page.getByRole('cell', { name: 'Espresso', exact: true }).waitFor();
  await page.getByRole('cell', { name: '$7.00', exact: true }).waitFor();
  await go('transaction?id=t0');
  await page.locator('.transaction-details').getByText('$5.00', { exact: true }).waitFor();
  await go('customers'); await page.getByRole('button', { name: 'Edit Customer 0', exact: true }).click();
  await page.getByLabel('Customer name', { exact: true }).fill('Updated Customer');
  await page.getByLabel('Phone number', { exact: true }).fill('555-0199');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Updated Customer', exact: true }).waitFor();
});
test('discount dialog applies a percentage and a flat deduction and posts the resulting sale', async () => {
  await go('');
  await page.getByRole('button', { name: 'Add your first item', exact: true }).click();
  await page.locator('.modal-item').first().click();
  await page.getByRole('button', { name: 'Discount', exact: true }).click();
  await page.getByLabel('Discount percentage', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Apply Discount', exact: true }).click();
  await page.locator('.transaction-details').getByText('$4.50', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Discount', exact: true }).click();
  await page.getByLabel('Discount type', { exact: true }).selectOption('0');
  await page.getByLabel('Discount amount', { exact: true }).fill('1.25');
  await page.getByRole('button', { name: 'Apply Discount', exact: true }).click();
  await page.locator('.transaction-details').getByText('$3.25', { exact: true }).waitFor();
  await page.getByRole('button', { name: english.BUTTON_POST_TRANSACTION, exact: true }).click();
  await page.getByRole('button', { name: 'Add your first item', exact: true }).waitFor();
  await go('transactions'); await rowCount(10);
  await page.locator('.custom-table tbody tr').first().getByText('$3.25', { exact: true }).waitFor();
});
test('settings download the English template, accept custom text, and persist Nepali fallback', async () => {
  await go('settings');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Text_EN.json', exact: true }).click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), 'Text_EN.json');
  assert.deepEqual(await downloadedJson(download), english);
  await page.getByLabel('Choose a custom locale JSON file').setInputFiles({ name: 'custom.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ NAVBAR_SETTINGS: 'Preferences Test' })) });
  await page.getByRole('option', { name: 'Custom', exact: true }).waitFor({ state: 'attached' });
  await page.getByLabel('Display language', { exact: true }).selectOption('custom');
  await page.getByRole('link', { name: 'Preferences Test', exact: true }).waitFor();
  await page.getByLabel('Display language', { exact: true }).selectOption('nepali');
  await page.reload();
  assert.equal(await page.getByLabel('Display language', { exact: true }).inputValue(), 'nepali');
  await page.getByRole('link', { name: 'Settings', exact: true }).waitFor();
});
test('backup controls download the full database and restore a reviewed file', async () => {
  await go('settings');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download full backup', exact: true }).click();
  const backup = await downloadedJson(await pending) as DatabaseBackup;
  assert.equal(backup.tables.TRANSACTIONS.length, 35);
  backup.tables.PRODUCTS[0].name = 'Restored Coffee';
  await page.getByLabel('Choose database backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  page.once('dialog', dialog => { void dialog.accept(); });
  await page.getByRole('button', { name: 'Replace demo workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Reload app', exact: true }).waitFor();
  await go('items');
  await page.getByRole('button', { name: 'Edit Restored Coffee', exact: true }).waitFor();
});


test('settings switch back to the existing demo without resetting practice records', async () => {
  await go('settings');
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: english.UI_USE_MY_REAL_WORKSPACE, exact: true }).click(),
  ]);
  await page.getByRole('button', { name: 'Switch to Demo', exact: true }).waitFor();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Switch to Demo', exact: true }).click(),
  ]);
  await page.locator('.demo-banner').waitFor();
  await go('transactions'); await rowCount(10);
  await page.getByText('1–10 of 35', { exact: true }).waitFor();
});

test('fresh demo populates catalog, customer summaries, sale history, and price history', async () => {
  await go('settings');
  page.once('dialog', dialog => { void dialog.accept(); });
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: english.UI_RESTART_DEMO, exact: true }).click(),
  ]);
  await go('transactions'); await rowCount(10);
  await page.getByText('1–10 of 24', { exact: true }).waitFor();
  await go('customers-transactions'); await rowCount(3);
  await page.locator('.custom-table tbody tr').first().click(); await rowCount(6);
  await go('price-history'); await rowCount(6);
  await go('items'); await rowCount(6);
  await go('customers'); await rowCount(3);
  await go('transaction?id=demo-sale-1');
  await page.locator('.transaction-details').getByText('$11.25', { exact: true }).waitFor();
});
