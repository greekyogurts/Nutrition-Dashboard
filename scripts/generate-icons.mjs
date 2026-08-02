/**
 * Regenerates public/icons/*.png and public/favicon.svg from one source of
 * truth, so a palette change can't leave the home-screen icons behind — which
 * is exactly what happened when the accent moved off iOS systemBlue and the
 * PNGs kept shipping the old colour.
 *
 * Run with `npm run icons` after changing BLUE or BG. Keep these two in sync
 * with --color-neon-blue and --color-bg-dark in src/styles.css.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BLUE = '#00afe7';
const BG = '#000000';

// Flat transform group rather than a nested <svg>: nested-svg sizing rendered
// unreliably here (the glyph overflowed the tile), a plain translate+scale of
// the 24-unit artwork does not.
const glyph = (x, y, size) => {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#fff"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    <polyline points="3.5 12 7.5 12 9.5 8 12.5 16 14.5 12 20.5 12"/>
  </g>`;
};

// Standard icon: dark canvas + rounded blue tile, inset 86 of 512, radius 76,
// glyph box at 161 size 190 -- the geometry recovered from the icons this
// replaces.
const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <rect x="86" y="86" width="340" height="340" rx="76" fill="${BLUE}"/>
  ${glyph(161, 161, 190)}
</svg>`;

// Maskable: same composition scaled into a 256px centred safe zone on dark,
// so the tile starts at 128 like the icon it replaces.
const k = 256 / 340;
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <rect x="128" y="128" width="256" height="256" rx="${(76 * k).toFixed(2)}" fill="${BLUE}"/>
  ${glyph((128 + (161 - 86) * k).toFixed(2), (128 + (161 - 86) * k).toFixed(2), 190 * k)}
</svg>`;

// apple-touch-icon is full-bleed (iOS applies its own mask). Cropping the
// viewBox to the tile keeps the glyph at exactly the proportion it has inside
// the tile.
const bleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="86 86 340 340">
  <rect x="86" y="86" width="340" height="340" fill="${BLUE}"/>
  ${glyph(161, 161, 190)}
</svg>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function render(svg, size, out) {
  const page = await browser.newPage({ viewport: { width: size + 64, height: size + 64 }, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:${BG}}
     svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  writeFileSync(out, await page.locator('svg').first().screenshot({ type: 'png' }));
  await page.close();
  console.log('wrote', out, `${size}x${size}`);
}

await render(tileSvg, 192, 'public/icons/icon-192.png');
await render(tileSvg, 512, 'public/icons/icon-512.png');
await render(maskableSvg, 512, 'public/icons/icon-maskable-512.png');
await render(bleedSvg, 180, 'public/icons/apple-touch-icon.png');

// The favicon keeps a transparent background so it sits on whatever the
// browser's tab strip uses, rather than punching a black square into it.
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="86" y="86" width="340" height="340" rx="76" fill="${BLUE}"/>
  ${glyph(161, 161, 190)}
</svg>
`);
console.log('wrote public/favicon.svg');

await browser.close();
