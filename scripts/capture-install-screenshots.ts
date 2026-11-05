import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import english from '../src/data/Text_EN.json';
import { demoProducts } from '../src/data/demoData';

const server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0, strictPort: true } });
await server.listen();
const address = server.httpServer!.address();
if (!address || typeof address === 'string') throw new Error('Screenshot server could not start');
const origin = `http://127.0.0.1:${address.port}`;
const base = `${origin}${server.config.base}`;
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await context.addInitScript(() => {
    localStorage.setItem('pos.welcomeSeen', 'true');
    sessionStorage.setItem('pos.workspace', 'demo');
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('.page-header').waitFor();
  await page.evaluate(async modulePath => {
    const { workspaceController } = await import(modulePath) as typeof import('../src/controllers/WorkspaceController');
    await workspaceController.resetDemo(true);
  }, `${base}src/controllers/WorkspaceController.ts`);
  await page.reload();
  for (const [index, product] of demoProducts.filter(product => ['demo-coffee', 'demo-croissant', 'demo-sandwich'].includes(product.id)).entries()) {
    await page.getByRole('button', { name: index ? english.BUTTON_ADD : english.UI_ADD_YOUR_FIRST_ITEM, exact: true }).click();
    await page.locator('.modal-item').filter({ hasText: product.name }).first().click();
  }
  await page.locator('.transaction-item').last().waitFor();
  await page.locator('h1').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const directory = new URL('../public/screenshots/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: new URL('desktop.png', directory).pathname });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}items`);
  await page.getByRole('button', { name: `Edit ${demoProducts[0].name}`, exact: true }).waitFor();
  await page.screenshot({ path: new URL('mobile.png', directory).pathname });
  console.log('Captured desktop and mobile install previews using an isolated demo browser.');
} finally {
  await browser.close();
  await server.close();
}
