import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { preview, PreviewServer } from 'vite';
import english from '../../src/data/Text_EN.json';
import { buildAppManifest } from '../../src/config/appBranding';

let server: PreviewServer;
let browser: Browser;
let context: BrowserContext;
let page: Page;
let base: string;
let workerVersion = 0;

before(async () => {
  const worker = await readFile(new URL('../../dist/sw.js', import.meta.url), 'utf8');
  server = await preview({ logLevel: 'silent', preview: { host: '127.0.0.1', port: 0, strictPort: true }, plugins: [{
    name: 'test-worker-version',
    configurePreviewServer(previewServer) {
      // Serve another worker revision without mutating the built files shared by tests.
      previewServer.middlewares.use((request, response, next) => {
        if (!request.url?.split('?')[0].endsWith('/sw.js')) { next(); return; }
        response.setHeader('Content-Type', 'application/javascript');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(`${worker}\n// Test worker revision ${workerVersion}`);
      });
    },
  }] });
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}${server.config.base}`;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
});
after(async () => { await browser?.close(); if (server) await new Promise<void>(resolve => server.httpServer.close(() => resolve())); });
beforeEach(async () => {
  workerVersion = 0;
  context = await browser.newContext();
  await context.route('https://**/*', route => route.abort());
  await context.addInitScript(() => { localStorage.setItem('pos.welcomeSeen', 'true'); sessionStorage.setItem('pos.workspace', 'demo'); });
  page = await context.newPage();
  page.setDefaultTimeout(15_000);
});
afterEach(async () => { await context?.close(); });

async function controlledApp() {
  const failures: string[] = [];
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) failures.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith(base)) failures.push(`${request.url()}: ${request.failure()?.errorText}`); });
  await page.goto(base);
  await page.locator('.page-header').waitFor();
  try { await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated'); }
  catch (error) { throw new Error(`Offline registration failed: ${failures.join('; ')}`, { cause: error }); }
  await page.goto(`${base}?cached-launch=1`);
  try { await page.waitForFunction(() => !!navigator.serviceWorker.controller); }
  catch (error) {
    const state = await page.evaluate(async () => ({ url: location.href, registrations: (await navigator.serviceWorker.getRegistrations()).map(registration => ({ scope: registration.scope, state: registration.active?.state, script: registration.active?.scriptURL })) }));
    const workers = await Promise.all(context.serviceWorkers().map(worker => worker.evaluate(async () => ({ caches: await caches.keys(), script: location.href }))));
    throw new Error(`Worker did not control page: ${JSON.stringify(state)}; workers: ${JSON.stringify(workers)}; ${failures.join('; ')}`, { cause: error });
  }
  await page.locator('.page-header').waitFor();
}

test('production HTML exposes scoped install metadata, icons, and previews without template tokens', async () => {
  const response = await page.goto(base);
  const html = await response!.text();
  assert.equal(html.includes('__STARTUP_'), false);
  assert.equal(html.includes('vite.svg'), false);
  const manifestUrl = await page.locator('link[rel=manifest]').getAttribute('href');
  assert.ok(manifestUrl);
  const manifest = await (await context.request.get(new URL(manifestUrl, base).href)).json();
  assert.equal(manifest.name, english.PWA_APP_NAME);
  assert.equal(manifest.scope, new URL(base).pathname);
  assert.equal(manifest.display, 'standalone');
  for (const asset of [...manifest.icons, ...manifest.screenshots]) {
    assert.equal((await context.request.get(new URL(asset.src, base).href)).ok(), true);
  }
  assert.ok(await page.locator('link[rel=apple-touch-startup-image]').count() > 0);
  assert.equal(manifest.icons.length, buildAppManifest('/').icons!.length);
});
test('an installed cache launches the app and its navigation while offline', async () => {
  await controlledApp();
  await context.setOffline(true);
  await page.goto(`${base}settings`);
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await page.getByText(english.PWA_OFFLINE, { exact: true }).waitFor();
  await page.getByText(english.PWA_OFFLINE_READY, { exact: true }).waitFor();
  assert.equal(await page.locator('.nav-brand img').evaluate((element: HTMLImageElement) => element.naturalWidth > 0), true);
});
test('a waiting update asks before reloading an unposted sale', async () => {
  await controlledApp();
  await page.evaluate(async () => {
    const request = indexedDB.open('POS_DEMO');
    const database = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('PRODUCTS', 'readwrite');
      transaction.objectStore('PRODUCTS').add({ id: 'test-product', name: 'Coffee', amount: 5 });
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await page.getByRole('button', { name: english.UI_ADD_YOUR_FIRST_ITEM, exact: true }).click();
  await page.locator('.modal-item').first().click();
  await page.locator('.transaction-details').getByText('$5.00', { exact: true }).waitFor();
  // A real service-worker update should never automatically reload the current view.
  const before = await page.evaluate(() => performance.timeOrigin);
  workerVersion++;
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await page.getByRole('button', { name: english.PWA_UPDATE_ACTION, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => performance.timeOrigin), before);
  page.once('dialog', dialog => { void dialog.dismiss(); });
  await page.getByRole('button', { name: english.PWA_UPDATE_ACTION, exact: true }).click();
  assert.equal(await page.evaluate(() => performance.timeOrigin), before);
  await page.locator('.transaction-details').getByText('$5.00', { exact: true }).waitFor();
});
test('the branded startup screen is visible while the app bundle loads, then disappears', async () => {
  await context.close();
  context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('pos.clientGlobal', JSON.stringify({ darkMode: true })));
  await context.route('https://**/*', route => route.abort());
  page = await context.newPage();
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/index-*.js', async route => { await held; await route.continue(); });
  try {
    await page.goto(base, { waitUntil: 'commit' });
    await page.locator('.app-boot').waitFor();
    await page.getByText(english.PWA_LOADING, { exact: true }).waitFor();
    assert.equal(await page.locator('.app-boot').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(38, 38, 38)');
    assert.equal(await page.locator('.app-boot-icon').evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), true);
    release();
    await page.locator('.page-header').waitFor();
    assert.equal(await page.locator('.app-boot').count(), 0);
  } finally { release(); }
});
test('a failed application download shows a recovery button instead of an endless spinner', async () => {
  await context.close();
  context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('https://**/*', route => route.abort());
  page = await context.newPage();
  await page.route('**/assets/index-*.js', route => route.abort());
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByText(english.PWA_LOAD_FAILED, { exact: true }).waitFor();
  await page.getByRole('button', { name: english.PWA_RELOAD, exact: true }).waitFor();
});
