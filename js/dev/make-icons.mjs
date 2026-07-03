// Dev-only icon renderer: rasterizes icons/icon.svg to the committed PNG set
// using the locally installed Playwright Chromium. Run once from repo root:
//   node js/dev/make-icons.mjs
// (Requires the global playwright install used by this repo's dev env.)

import { createRequire } from 'module';
import { readFileSync, mkdirSync } from 'node:fs';

const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const svg = readFileSync('icons/icon.svg', 'utf8');
// [file, canvas size, glyph scale] — maskable keeps art in the safe zone.
const jobs = [
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  ['maskable-192.png', 192, 0.8],
  ['maskable-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 1.0],
];

mkdirSync('icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;background:#0d1119;display:grid;place-items:center;overflow:hidden">
    <div style="width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px">${svg}</div></body>`);
  await page.screenshot({ path: `icons/${name}` });
  console.log('wrote icons/' + name);
}
await browser.close();
