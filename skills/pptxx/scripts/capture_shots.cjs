// capture_shots.cjs — runtime pptxx per-slide screenshotter (full-bleed export feed).
//
// Generalizes the M1 spike at docs/.../spikes/screenshot/capture.cjs into a
// deck-directory CLI:
//
//     NODE_PATH="<global node_modules>" node capture_shots.cjs <deck-dir>
//
// - Loads `<deck-dir>/index.html`, discovers every `<section class="slide" id="slide-NN">`,
//   and captures each element at the frozen 1280x720 viewport.
// - Offline-safe by construction: javaScriptEnabled:false + a deny-by-default
//   request block. Only local `file://` resources INSIDE the deck subtree may
//   load (the deck HTML plus same-dir assets such as images/); everything else
//   (remote, file escapes, any scheme) is aborted. This widens the spike's
//   "deck file only" allowlist by exactly one notch so a deck's own local
//   images render, without ever reaching the network.
// - Output: `<deck-dir>/shots/slide-NN.png` (NN zero-padded from 01, slide order).
//   Prints a capture count on stdout; exit 0 on success, non-zero on failure.
//
// RUNTIME ONLY: the gate suite never imports/requires/spawns this file (it is
// under skills/, out of the z1/z3 scan scope). Playwright is resolved through
// NODE_PATH pointing at the global install — this file declares no dependency.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function die(msg, code = 2) {
  console.error('capture_shots: ' + msg);
  process.exit(code);
}

(async () => {
  const deckDir = process.argv[2];
  if (!deckDir) die('usage: node capture_shots.cjs <deck-dir>');
  const deckAbs = path.resolve(deckDir);
  const deckHtml = path.join(deckAbs, 'index.html');
  if (!fs.existsSync(deckHtml)) die('index.html not found in deck directory: ' + deckAbs);

  // Realpath of the deck subtree — the allowlist root for local resources.
  const deckReal = fs.realpathSync(deckAbs);
  const deckUrl = 'file:///' + deckHtml.replace(/\\/g, '/');

  const shotsDir = path.join(deckAbs, 'shots');
  if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      // Layout stays 1280x720 (slide addressing contract), but deviceScaleFactor
      // renders 3x device pixels so each raster is 3840x2160 (4K). Pouring that
      // full-bleed onto a 13.33x7.5in slide yields ~288 DPI — crisp on projectors
      // and large displays instead of the ~96 DPI mush of an unscaled capture.
      deviceScaleFactor: 3,
      viewport: { width: 1280, height: 720 },
    });
    // Deny-by-default: continue ONLY local file:// resources inside the deck
    // subtree (the deck HTML and any same-dir asset like images/). Abort
    // everything else — remote URLs, file escapes outside the deck, any scheme.
    await context.route('**/*', (route) => {
      const u = route.request().url();
      if (!u.startsWith('file://')) return route.abort();
      let local;
      try {
        local = fs.realpathSync(decodeURIComponent(u.slice('file:///'.length)));
      } catch (e) {
        return route.abort();
      }
      if (local === deckReal || local.startsWith(deckReal + path.sep)) {
        route.continue();
      } else {
        route.abort();
      }
    });

    const page = await context.newPage();
    await page.goto(deckUrl, { waitUntil: 'load' });

    // Discover slides in DOM order, then sort by the zero-padded NN in the id
    // so output order is stable regardless of source ordering.
    const ids = await page.$$eval('section.slide[id^="slide-"]', (els) =>
      els.map((e) => e.id)
    );
    if (ids.length === 0) die('no <section class="slide" id="slide-NN"> found in ' + deckHtml);
    const sorted = ids
      .map((id) => ({ id, nn: (id.match(/slide-(\d+)/) || [])[1] }))
      .filter((x) => x.nn)
      .sort((a, b) => a.nn.localeCompare(b.nn, undefined, { numeric: true }));

    let count = 0;
    for (const { id, nn } of sorted) {
      const out = path.join(shotsDir, 'slide-' + nn + '.png');
      await page.locator('#' + id).screenshot({ path: out });
      console.log('captured shots/slide-' + nn + '.png');
      count++;
    }
    console.log('wrote ' + count + ' shot' + (count === 1 ? '' : 's') + ' to ' + path.relative(process.cwd(), shotsDir));
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
