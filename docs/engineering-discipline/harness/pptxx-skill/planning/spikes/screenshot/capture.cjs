// Playwright per-slide capture spike (Task 4).
// Run with: NODE_PATH="C:\Users\tmdgu\AppData\Roaming\npm\node_modules" node capture.cjs
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const dir = __dirname;
  const deckPath = path.join(dir, 'sample-deck.html');
  const deckUrl = 'file:///' + deckPath.replace(/\\/g, '/');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 720 },
  });
  // Deny-by-default request blocking: only the deck file itself may load.
  await context.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file://') && u.includes('sample-deck.html')) {
      route.continue();
    } else {
      route.abort();
    }
  });

  const page = await context.newPage();
  await page.goto(deckUrl);
  for (const nn of ['01', '02', '03']) {
    await page.locator('#slide-' + nn).screenshot({ path: path.join(dir, 'slide-' + nn + '.png') });
    console.log('captured slide-' + nn + '.png');
  }
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
