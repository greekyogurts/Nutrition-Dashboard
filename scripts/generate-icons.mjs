/**
 * Regenerates public/icons/*.png and public/favicon.png from one raster
 * source of truth (scripts/assets/logo-source.png — the potted-sprout
 * artwork), so every home-screen/tab icon stays in sync with a single file
 * rather than drifting across five hand-exported PNGs.
 *
 * The source lives outside public/ deliberately: it's a build-time input,
 * not something the browser ever fetches, so it shouldn't get copied into
 * the deployed output. Only the five rendered sizes below do.
 *
 * The source ships as a full-bleed square with its rounded "app icon"
 * corners already baked in as flat black triangles (an AI-generated icon
 * mockup convention). Every OS that consumes these icons applies its own
 * corner mask on top (iOS's squircle, Android's adaptive-icon shape), so
 * shipping the source's own rounding verbatim risks a visible seam where
 * the OS's mask radius doesn't exactly match the source's — a sliver of
 * black corner peeking through, or a faint double-rounded edge. `deCorner`
 * below replaces those near-black corner pixels with the artwork's own
 * cream background tone, producing one full-bleed square that every output
 * size (including the maskable icon, which requires full-bleed content
 * with a safe zone that this composition's generous internal padding
 * already satisfies) can be scaled from directly.
 *
 * Run with `npm run icons` after replacing source.png.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'scripts/assets/logo-source.png';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

const sourceB64 = readFileSync(SOURCE).toString('base64');
await page.setContent(`<img id="src" src="data:image/png;base64,${sourceB64}">`);
await page.waitForFunction(() => document.getElementById('src').complete);

/**
 * Loads the source once into an in-page canvas, flattens the baked-in
 * corner rounding to full-bleed, and returns a data URL other pages can
 * draw from — the actual per-size scaling happens in `render`, in a fresh
 * page each time, so canvas state never leaks between exports.
 */
const deCorneredDataUrl = await page.evaluate(() => {
  const img = document.getElementById('src');
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;

  // Sampled from the artwork's own background paper tone, well clear of
  // both the corner triangles and the pot/plant motif.
  const [cr, cg, cb] = [247, 229, 190];
  const isNearBlack = (i) => d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30;

  for (let i = 0; i < d.length; i += 4) {
    if (isNearBlack(i)) {
      d[i] = cr;
      d[i + 1] = cg;
      d[i + 2] = cb;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL('image/png');
});

async function render(size, out) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(
    `<style>html,body{margin:0;padding:0}img{display:block;width:${size}px;height:${size}px}</style>
     <img src="${deCorneredDataUrl}">`,
  );
  await p.waitForFunction(() => document.querySelector('img').complete);
  writeFileSync(out, await p.locator('img').screenshot({ type: 'png' }));
  await p.close();
  console.log('wrote', out, `${size}x${size}`);
}

await render(192, 'public/icons/icon-192.png');
await render(512, 'public/icons/icon-512.png');
// Maskable and standard icons share one export: the source's own padding
// around the pot already sits well inside the ~66%-diameter safe zone
// adaptive-icon masks require, so no separate crop/zoom is needed.
await render(512, 'public/icons/icon-maskable-512.png');
await render(180, 'public/icons/apple-touch-icon.png');
await render(64, 'public/favicon.png');

await browser.close();
