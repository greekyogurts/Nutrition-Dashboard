/**
 * MIGRATION PARITY GATE
 *
 * Runs the live index.html and the new typed modules against byte-identical
 * data, then diffs every derived number. The migration is only safe if this
 * reports zero drift — a rewrite that quietly changes someone's calorie target
 * is worse than no rewrite at all.
 *
 *   npx tsx scripts/parity.ts
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeBaselines, normalizeLog, baselineOn, tdeeForRow, meanTdee } from '../src/lib/baseline';
import { computeEnergy } from '../src/lib/energy';
import { macroTargetsFor } from '../src/lib/macros';
import { microTargetsFor, watchedNutrients } from '../src/lib/micros';
import { BASELINES_RAW, LOG_RAW, BEN } from '../src/lib/fixtures';
import type { Profile } from '../src/lib/profile';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHART_STUB =
  'window.Chart=function(c,cfg){this.config=cfg;this.destroy=()=>{};this.resize=()=>{};' +
  'this.update=()=>{};this.data=cfg&&cfg.data||{labels:[],datasets:[]};};';

/** The profile shapes to compare across. */
const CASES: Array<{ name: string; profile: Profile }> = [
  { name: 'Ben, balanced, lose', profile: BEN },
  { name: 'maintain', profile: { ...BEN, goal: 'maintain' } },
  { name: 'gain', profile: { ...BEN, goal: 'gain' } },
  { name: 'keto', profile: { ...BEN, diet: 'keto' } },
  { name: 'carnivore', profile: { ...BEN, diet: 'carnivore' } },
  { name: 'high protein', profile: { ...BEN, diet: 'high_protein' } },
  { name: 'mediterranean', profile: { ...BEN, diet: 'mediterranean' } },
  { name: 'high carb', profile: { ...BEN, diet: 'high_carb' } },
  { name: 'custom 200g protein', profile: { ...BEN, diet: 'custom', custom_protein_g: 200 } },
  { name: 'custom 200p/70f', profile: { ...BEN, diet: 'custom', custom_protein_g: 200, custom_fat_g: 70 } },
  { name: 'female 30', profile: { ...BEN, sex: 'female', birth_year: 1996 } },
  { name: 'female 56', profile: { ...BEN, sex: 'female', birth_year: 1970 } },
  { name: 'male 76', profile: { ...BEN, birth_year: 1950 } },
  { name: 'vegan + gluten free', profile: { ...BEN, restrictions: ['vegan', 'gluten_free'] } },
  { name: 'no profile', profile: null as unknown as Profile },
];

const server = http.createServer(async (_q, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(await readFile(path.join(root, 'index.html')));
});
await new Promise<void>((r) => server.listen(8899, () => r()));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
const pageErrors: string[] = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.route('**://cdn.jsdelivr.net/npm/chart.js**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: CHART_STUB }));
await page.route('**://cdn.tailwindcss.com**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
await page.route('**://coyvxupbwxhfzfoxgnzv.supabase.co/**', (r) => {
  const u = r.request().url();
  const body = u.includes('/daily_log') ? LOG_RAW : u.includes('/tdee_baseline') ? BASELINES_RAW : [];
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
await page.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// ---- new implementation, same inputs ----
const baselines = normalizeBaselines(BASELINES_RAW);
const log = normalizeLog(LOG_RAW);

let checked = 0;
const drift: string[] = [];
function cmp(label: string, oldVal: unknown, newVal: unknown) {
  checked++;
  const a = JSON.stringify(oldVal);
  const b = JSON.stringify(newVal);
  if (a !== b) drift.push(`  ${label}\n      old: ${a}\n      new: ${b}`);
}

for (const { name, profile } of CASES) {
  // Drive the live page's own globals, then read what it computes.
  const oldVals = await page.evaluate((p) => {
    // eslint-disable-next-line no-undef
    const prev = (globalThis as never as { profile: unknown }).profile;
    (globalThis as never as { profile: unknown }).profile = p;
    const e = computeEnergy(p);
    const m = macroTargetsFor(p);
    const micros = microTargetsFor(p).map((x: { name: string; target: number; targetLabel: string }) =>
      [x.name, x.target, x.targetLabel]);
    const watched = watchedNutrients(p);
    (globalThis as never as { profile: unknown }).profile = prev;
    return {
      energy: e && { tdee: e.tdee, target: e.target, baselineCal: e.baselineCal, burn: e.burn, source: e.source, weightLb: e.weightLb },
      macros: { p: m.protein_g, c: m.carbs_g, f: m.fat_g, fib: m.fiber_g, derived: m.derived },
      micros,
      watched,
    };
  }, profile as never);

  const e = computeEnergy({ profile, log, baselines });
  const m = macroTargetsFor(profile, e);
  cmp(`[${name}] energy`, oldVals.energy,
    e && { tdee: e.tdee, target: e.target, baselineCal: e.baselineCal, burn: e.burn, source: e.source, weightLb: e.weightLb });
  cmp(`[${name}] macros`, oldVals.macros,
    { p: m.protein_g, c: m.carbs_g, f: m.fat_g, fib: m.fiber_g, derived: m.derived });
  cmp(`[${name}] micro targets`, oldVals.micros,
    microTargetsFor(profile).map((x) => [x.name, x.target, x.targetLabel]));
  cmp(`[${name}] watched`, oldVals.watched, watchedNutrients(profile));
}

// ---- baseline resolution across the effective_date boundary ----
for (const d of ['2026-06-12', '2026-06-13', '2026-07-01', '2026-07-28', '2026-07-29', '2026-08-20']) {
  const oldV = await page.evaluate((dd) => baselineOn(dd)?.baseline_cal ?? null, d);
  cmp(`baselineOn(${d})`, oldV, baselineOn(baselines, d)?.baseline_cal ?? null);
}

// ---- per-row TDEE across every logged day ----
for (const row of LOG_RAW) {
  const oldV = await page.evaluate((r) => tdeeForRow(r), row as never);
  const newRow = log.find((l) => l.log_date === row.log_date)!;
  cmp(`tdeeForRow(${row.log_date})`, oldV, tdeeForRow(newRow, baselines));
}

// ---- range mean, the figure the overview headline shows ----
const oldMean = await page.evaluate(() => {
  const rows = allLog.filter((r: { is_complete?: boolean }) => r.is_complete !== false);
  const vals = rows.map((r: never) => tdeeForRow(r)).filter((v: number | null) => v != null);
  return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
});
cmp('mean TDEE over complete days', oldMean, meanTdee(log.filter((r) => r.is_complete), baselines));

await browser.close();
server.close();

console.log(`\nCompared ${checked} derived values across ${CASES.length} profile shapes.`);
if (pageErrors.length) console.log('Page errors:', pageErrors.join('; '));
if (drift.length) {
  console.log(`\n${drift.length} MISMATCH(ES):\n${drift.join('\n')}`);
  process.exit(1);
}
console.log('No drift — the typed modules match index.html exactly.\n');
