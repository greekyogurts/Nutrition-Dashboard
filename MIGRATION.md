# Migration: single-file HTML → Vite + React + TypeScript

Living document. A session picking this up cold should be able to read this and
know exactly where things stand and what comes next.

## Why

`index.html` is ~3,200 lines (492 CSS / 366 HTML / 2,310 JS) doing framework work
by hand: manual DOM templating, hand-wired listeners, and **11 module-level
mutable globals**. Several of those globals — `lastYogurtStats`, `lastPlantStats`,
`lastMicroStats`, `lastActivityRows`, `lastSleepRows`, `lastTrendRows` — exist
purely because one render function computes something another needs later and
there is no props mechanism to pass it. That's a framework-shaped hole.

Three bugs hit during recent work were all compile-time catchable:

| Bug | What TypeScript does |
| --- | --- |
| `energy.bmr` referenced after the field was removed | Property does not exist |
| `macroTargetsFor` returning nulls callers didn't expect | Nullable return must be handled |
| PostgREST returning `damping_k: "0.5"` where a number was assumed | Raw vs normalized types can't be interchanged |

## Target stack

| Piece | Choice | Why |
| --- | --- | --- |
| Build | **Vite** | Fast, static output, same GitHub Pages deploy |
| UI | **React + TypeScript** | Motion is React-first; kokonutui is React; most training data for future AI sessions. Svelte was runner-up — less code, better built-in transitions, smaller ecosystem |
| Styling | **Tailwind, compiled** | The CDN ships the whole framework + a JIT compiler (~100KB+). A real build ships only used classes (~5–15KB). Net payload likely *shrinks* despite adding React |
| Animation | **Motion** (Framer Motion) | `layoutId` shared-element transitions, real spring physics, interruptible gestures |
| Server state | **TanStack Query** | Deletes the hand-rolled loading/error/refresh logic; adds caching |
| DB | **@supabase/supabase-js** + generated types | Typed rows; the path to auth/RLS if this ever goes multi-user |
| Charts | **Chart.js via react-chartjs-2** initially | 14 existing configs port near-verbatim. Upgrade individual charts to Recharts/visx later where motion matters |
| Tests | **Vitest** (logic) + **Playwright** (DOM) | Pure functions belong in fast unit tests, not a browser |

## Phases

| Phase | What | Live site | Status |
| --- | --- | --- | --- |
| 0 | Scaffold Vite + TS + Tailwind + CI | untouched | **done** |
| 1 | Extract pure logic to typed modules + Vitest + parity gate | untouched | **done** |
| 2 | supabase-js client, generated DB types, TanStack Query hooks | untouched | **done** |
| 3 | App shell + Overview card; local parity comparison; CI build step | untouched | **done** |
| 4 | Remaining cards, one PR each: Micros, Activity, Sleep, Trends, Supplements, Labs, profile, explainers | untouched | **done** |
| 5 | Cutover: flip Pages to built output, delete `index.html`, tag the old one | **live** | **done** |
| 6 | The payoff: animation, gestures, data entry, PWA | live | tap-to-expand modals + animation/gestures done; data entry deliberately deferred; PWA not started |

### Important correction to the original plan

An earlier draft proposed deploying phase 3 side-by-side with the live site for
comparison. **That isn't possible.** A GitHub Actions Pages deploy requires
switching the Pages source away from the branch, which immediately stops serving
`index.html`. So:

- Parity comparison happened **locally** (`npm run parity`) through phases 1-4.
- Pages source is flipped **once**, at phase 5 — see "Phase 5: cutover" below.
- `.github/workflows/ci.yml` deliberately does not deploy; `deploy.yml` does,
  and only takes effect once the Pages source switch happens.

## The parity gate (retired at cutover)

Through phases 1-4, `npm run parity` loaded the live `index.html` in a headless
browser and the new typed modules in Node, fed both **byte-identical fixture
data copied from production**, and diffed every derived number.

Final tally before retirement: **135 derived values across 15 profile shapes,
zero drift, every phase.**

That was the migration's safety net against quietly changing someone's calorie
target. Its premise was always "compare the vanilla dashboard against the new
one" — once `index.html` *is* the new one (phase 5), there's no vanilla left to
diff against, so `scripts/parity.ts` and `npm run parity` are gone. The ~140
unit tests in `src/lib/*.test.ts` are the ongoing safety net going forward;
they test the same logic, just without a second implementation to compare it
to.

## What exists now

```
index.html           React entry — was app.html through phase 4, see "Phase 5: cutover"
src/
  main.tsx           QueryClientProvider + root
  App.tsx            Shell: header, range tabs, swipe container, dots
  styles.css         Tailwind v4 + the vanilla design tokens
  components/
    OverviewCard.tsx Energy balance, macros, vitals
    MicrosCard.tsx   Micronutrient grid, worst/best watch callout
    ActivityCard.tsx Stat tiles, 4 Chart.js panels, recent workouts list
    SleepCard.tsx    Sleep/HRV/RHR vitals, duration bar + dual-line recovery chart
    TrendsCard.tsx   5 charts, consistency heatmap, sleep/score insight
    SupplementsCard.tsx  Static current-stack list
    LabsCard.tsx     Static latest-panel list, status pill colour
    ProfileModal.tsx Profile/goals form with a live-computed targets preview
    ExplainChip.tsx  ExplainChip (icon) / ExplainTerm (dashed-underline text)
    ExplainerSheet.tsx  The "What this means" bottom sheet
  state/
    useProfile.ts    localStorage profile; ignores removed legacy fields
    ExplainerContext.tsx  Which explainer is open; renders the sheet
  lib/ranges.ts      rowsForRange, getRangeDates, avgOf, viewLabel
  lib/chartSetup.ts  Chart.js component registration, imported once
  lib/explainers.ts  EXPLAINERS registry — 23 terms, pure data
src/data/
  database.types.ts  Generated from the live schema
  wire.ts            Widens `numeric` columns to what PostgREST really sends
  client.ts          SUPABASE_URL/KEY — plain fetch, not supabase-js (dropped, see phase 3)
  fetch.ts           Paged fetchers; fetchAllPages is separately testable
  queries.ts         useDashboardData — parallel queries, independent failure
src/lib/
  types.ts       Raw (wire) vs normalized domain types + coercion boundary
  profile.ts     Profile, GOALS, profileAge, currentWeightLb
  baseline.ts    normalize*, baselineOn, latestBaseline, tdeeForRow, meanTdee
  energy.ts      computeEnergy — baseline + burn, no BMR formula
  macros.ts      DIETS as a discriminated union, macroTargetsFor
  micros.ts      microTargetsFor (sex/age RDAs), microStatsFor, microBarColor
  activity.ts    activityStatsFor, hr/volume/burn series, typeBreakdown, relativeDay
  format.ts      sleepDurationLabel — shared between Overview and Sleep
  trends.ts      pearson, correlation captions, rolling deficit avg, buildHeatmap
  vitals.ts      yogurtStatsFor, plantStatsFor — Overview's Yogurt/Plant tiles
  fixtures.ts    Real production rows, string numerics included
  *.test.ts      136 unit tests, ~1s
```

### Design decisions worth preserving

- **Pure functions with explicit inputs.** The old code read module globals
  (`allLog`, `profile`, `allBaselines`). Every extracted function now takes what
  it needs as a parameter. That is what makes them testable in milliseconds.
- **Raw vs normalized types.** `RawTdeeBaseline` (wire) and `TdeeBaseline`
  (normalized) are separate types, so the string-numeric bug is unrepresentable.
- **`DIETS` is a discriminated union** on `kind: 'percent' | 'carbCap' |
  'custom'`, replacing duck-typing on which fields happened to exist. The
  compiler now enforces exhaustive handling.
- **Nulls stay null.** `macroTargetsFor` returns all-null when it lacks a weight
  or calorie figure rather than fabricating a plausible number. Nullable
  analytics columns on the seed baseline row stay null so charts leave a gap
  instead of drawing a cliff to zero.

## Costs, stated plainly

- **No more editing in GitHub's web UI.** Every change needs Node and a build.
- **Pages deploy changed** at phase 5 — `.github/workflows/deploy.yml` builds
  and deploys on push to `main`, replacing "serve the branch root" with "serve
  a Vite build." Requires the one-time manual Pages source switch described
  below.
- **`base: '/Nutrition-Dashboard/'`** in `vite.config.ts` — this is a project
  page, not a user page. Wrong base 404s every asset while `index.html` still
  loads, which looks like a blank app rather than a config error.

## Porting notes for later phases

- The existing Playwright suites in the scratchpad test behaviour through the
  DOM and largely survive. But calls like
  `page.evaluate(() => computeEnergy(profile))` will not — module scope isn't
  global once bundled. Those become Vitest unit tests, which is where they
  belonged.
- The explainer registry (23 entries — see the phase 4 explainer-sheets note
  below for where the "26" in an earlier draft came from) is already pure data
  and ports verbatim.
- `surplus_deficit` is a generated Postgres column (`calories - tdee`). Prefer
  reading it over recomputing.
- Never backfill historical `daily_log.tdee`. Past rows deliberately record what
  was believed at the time.

## Schema findings (phase 2)

Generating types from the live schema surfaced things not in any handoff doc:

- **`numeric` columns arrive as JSON strings.** The Supabase-generated types
  declare them `number`, because they describe Postgres's logical types, not the
  payload. PostgREST serializes `numeric` as a string to preserve precision.
  Affected: `daily_log.sleep_hours`/`weight_lb`, all four `tdee_baseline`
  analytics columns, `micronutrients.amount`, six `activities` columns, five
  `meal_items` columns, most of `food_presets`, and the `weight_trend` averages.
  `src/data/wire.ts` widens exactly those, derived from the generated Rows so a
  schema change becomes a type error. The vanilla dashboard survives this by
  calling `Number()` at every use site — verified, not a live bug.
- **`daily_log.tdee` is NOT NULL.** So `tdeeForRow`'s derive-from-baseline path is
  unreachable for real rows today. It stays as defensive cover for a future row
  written without one.
- **`weight_trend` view already computes rolling averages** server-side —
  `weight_7d_avg`, `weight_14d_avg`, `calories_7d_avg`, `calories_14d_avg`, plus
  `weight_days_in_*_window` so you know how many weigh-ins actually backed each
  average. The dashboard recomputes these client-side. Worth switching in a later
  phase.
- **`food_presets` exists** with a full micronutrient column set, and
  **`meal_items.preset_id`** references it. Structured food logging is already
  modelled in the database — the data-entry feature is much closer than it looks.
- **`supplement_log`** tracks per-day supplement intake. The dashboard only reads
  the static `supplements` list, so this data is currently unused.
- **`tdee_baseline.burn_method`** column exists and is not mentioned in the
  calibration handoff.

## Phase 3 decisions

### `app.html`, not `index.html` (superseded at cutover — see below)

Through phase 4, the React entry was `app.html`. `index.html` belonged to the
vanilla dashboard and was what Pages served, so `npm run dev` showed the old
app at `/` and the new one at `/app.html` — side by side, for eyeballing
parity. Phase 5 renamed `app.html` to `index.html` and dropped the Vite
`rollupOptions.input` override, exactly as planned here.

### supabase-js was tried and dropped

Measured, not assumed:

| | gzipped JS |
| --- | --- |
| with `@supabase/supabase-js` | 125 KB |
| with plain `fetch` | **76 KB** |

The client pulls in realtime-js, auth-js and storage-js regardless, and the
dashboard makes nine read-only selects. 49 KB — 39% of the bundle — for
capabilities nothing uses. Type safety was never the reason to keep it: the
generated `Database` types and the wire widening do that work independently.
Add it back if auth ever lands; it earns its weight then.

### Bundle size, actual numbers

| | gzipped |
| --- | --- |
| New: html + css + js | **82 KB** |
| Old: index.html 45 KB + Tailwind CDN ~120 KB + Chart.js ~70 KB | ~235 KB |

The CSS is the big win — 9 KB compiled versus roughly 120 KB for the CDN, which
ships an entire JIT compiler to the browser. Chart.js still has to be added back
in phase 4 (~70 KB), which puts the projection near 150 KB — still well under
the current payload, but the margin is not unlimited. Worth re-measuring after
the charts land rather than assuming.

### One deliberate behaviour change

`avgOf` now excludes missing values instead of counting them as zero. The vanilla
version does `Number(r[key] || 0)` and keeps the row in the divisor, so averaging
weight over days without a weigh-in pulls the mean toward zero. Every column the
overview averages is NOT NULL today, so the two agree exactly — the parity gate
compares `avgOf` across all five ranges and nine fields to prove it.

## Phase 4 progress

### Micros card — done

Ported the grid, the worst/best "Watch" callout, restriction-driven risk line,
and the pct-ordered tile layout (CSS `order`, worst tile ringed) verbatim.
`microStatsFor` and `microBarColor` in `src/lib/micros.ts` are new pure,
tested functions extracted from the vanilla `renderMicros`/`barColor`; the
tracking-start-date filtering (so "All Time" doesn't dilute toward zero over
months before micronutrients were logged) carried over unchanged.

Confirmed by fixture-driven test, not assumed: an RDA nutrient with **zero**
logged rows still reads a real 0%, so it can win "worst" outright — the
vanilla app rings that tile even when nothing has been logged for it at all.
`hasData` (whether any micronutrient row fell in the tracked range) gates only
the callout *text*, exactly like the original's `rows.length` check.

Deliberately deferred, to keep this PR to the card itself:
- **Tap-to-expand modal** (source breakdown, 30-day history chart). The
  original's `openMicroExpand` needs Chart.js, which isn't in the bundle yet.
  Modal infrastructure + Chart.js should land together, most likely with
  Activity or Trends, which need real charts more centrally (14 configs).
- **"Set up your profile" link** in the no-sex-set nudge. There's no profile
  editor in the React app yet — `openProfile()` doesn't exist here — so the
  nudge is plain text until the profile phase-4 item lands.

### Activity card — done

`chart.js` + `react-chartjs-2` landed here, as flagged in the Micros writeup
above — this is the first card whose primary content *is* charts (training
volume, workout-type breakdown, calories burned, avg HR per workout), so
there was no scoping it out. `src/lib/chartSetup.ts` registers the Chart.js
components once; each chart panel renders in the original's "compact" mode
(no axes, no legend — that's the embedded-card style, distinct from the
expand-modal's full axes).

`src/lib/activity.ts` ports `renderActivity`'s aggregation as pure, tested
functions: `activityStatsFor` (workouts/avgHR/burn), `hrSeries` (excludes
activities with no recorded HR rather than charting them as an invisible
zero-height bar — a real original decision, not new), `volumeSeries`
(per-date-per-sport duration for the stacked bar), `typeBreakdown` (per-sport
totals for the doughnut), `burnSeries`, and `relativeDay` (Today/Yesterday/N
days ago for the recent-workouts list, returned as a discriminated union so
the component — not the lib — owns the English phrasing).

The "Recent" list intentionally reads `all activities`, not the range-filtered
rows — "Always latest" in the original UI, ported as-is via `recentActivities`.

Bundle cost, measured: gzipped JS went from 77 KB (Micros PR) to **137 KB**
with Chart.js + react-chartjs-2 added. Still under the vanilla dashboard's
~235 KB (index.html + Tailwind CDN + Chart.js), matching the ~150 KB
projection from phase 3 — worth re-checking again once Trends adds its
remaining chart types.

Deferred, same reasoning as Micros:
- **Tap-to-expand modal** for each chart panel (full-size axes, captions).
  Shared modal infrastructure belongs in its own PR so every chart card
  benefits at once instead of four bespoke implementations.

### Sleep & Recovery card — done

The smallest of the remaining cards: 3 vital tiles (Sleep/HRV/RHR, averaged
or single-day same as Overview) plus two compact charts — a sleep-duration
bar and a dual-line HRV-vs-RHR chart. No new pure-logic module was needed
beyond `sleepDurationLabel`, pulled out of `OverviewCard.tsx` into
`src/lib/format.ts` so both cards share one tested implementation instead of
two copies — it already differs from the vanilla `sleepHoursLabel` by
zero-padding minutes (`7h05m`, not `7h5m`), a phase-3 decision now
consolidated rather than duplicated.

Reused `contextRows` from `src/lib/ranges.ts` unchanged — it's the exact
match for the vanilla `getContextRows` (trailing 7-day window when a single
day is selected, so a lone point never has to pass as "a trend"), already
built in phase 1 but not yet consumed by anything until now.

One thing **not** ported: the vanilla `renderSleepRecovery(range,
overviewStats)` takes Overview's already-computed averages as a parameter —
exactly the "one render function computes something another needs" pattern
called out as a framework-shaped hole in this doc's "Why" section. The React
port computes `avgOf(rowsForRange(log, selection), 'hrv' | 'rhr' |
'sleep_hours')` locally instead, from the same pure inputs Overview uses, so
Sleep needs no data from a sibling component to render correctly.

`chartSetup.ts` gained `LineElement`/`PointElement` for the recovery chart —
`react-chartjs-2`'s `Line`/`Bar`/`Doughnut` imports self-register their
controller, only the shared elements need registering once.

Deferred, same reasoning as the other two cards: the tap-to-expand modal.

### Trend Charts card — done

The largest card so far: five charts (Weight, Calories vs TDEE, Surplus/
Deficit, Deficit vs Weight scatter, Baseline Calibration), the consistency
heatmap, and the sleep/score "Insight" callout. `src/lib/trends.ts` carries
the new logic — `pearson`, `sleepScoreInsight`, `weightCoverageNote`,
`rollingAvgDeficitAt` + `deficitWeightPoints`/`deficitWeightCaption`,
`baselineCaption`, and `buildHeatmap` — 22 new tests.

Two things worth flagging:

- **`rollingAvgDeficitAt` reads the full log, not the visible range.** The
  Deficit-vs-Weight scatter needs a trailing 7-day average ending on each
  weigh-in date, and a weigh-in near the start of a short range (e.g. "Last
  7") still needs real lookback before that window — so this is the one
  function in this card that takes `log` *and* `rows` separately, on purpose.
- **`sleepScoreInsight`'s null-filtering is stricter than the vanilla's.** The
  original does `Number(r.sleep_hours)` and filters `isNaN`, but
  `Number(null)` is `0`, not `NaN` — so a genuinely missing value would have
  silently counted as a real zero and skewed the correlation. `sleep_hours`
  and `score` are NOT NULL in the live schema (verified in `database.types.ts`,
  same fact that already justified the `avgOf` deviation in phase 3), so this
  never fires on production data; the port filters on `!= null` directly
  since that's what the code actually intends and there's no live case where
  it disagrees.

The consistency heatmap is plain divs, not Chart.js — a GitHub-style
contribution grid gains nothing from a charting library. `HEATMAP_COLORS` is
a single exported map so the grid cells and the legend swatches can't drift
out of sync with each other.

Baseline Calibration is the one chart in this card that does **not** hide its
axes/legend in the embedded view — that's a deliberate original choice (the
gap between "Adopted" and "Implied" *is* the point of the chart), carried
over unchanged.

Deferred, same reasoning as the other three chart cards: the tap-to-expand
modal — for Baseline Calibration specifically, that modal is a full
arithmetic walkthrough (`openBaselineExpand`, reconstructing the damping
calculation per row) substantial enough to deserve its own pass rather than
folding into generic chart-zoom infrastructure.

### Supplements & Labs cards — done

The two static, non-date-ranged cards (`renderSupplements`/`renderLabs`)
ported together — both are a fetched list rendered into `.list-row`-style
rows with no aggregation, so there was nothing to put in `src/lib`. The lab
status pill's color rule (`status.toLowerCase().includes('monitor')` →
amber, else green) stayed inline in `LabsCard.tsx` rather than becoming a
pure helper — it's a single ternary used in exactly one place, below the
bar this codebase uses for extraction (compare `microBarColor` or
`sportColor`, both real lookup tables reused across a card and its legend).

### Profile editor — done

Ports `openProfile`'s form and its live preview (`renderProfilePreview`) —
name, sex, age, goal, diet, custom-diet fields, restrictions — as
`ProfileModal.tsx`. This is the clearest case yet for what phase 3's "Why"
called a framework-shaped hole: the vanilla version needed `wireProfileForm`
to manually attach eight listeners so every field edit could re-run
`renderProfilePreview`, plus `readProfileForm` to scrape the DOM back into an
object on every keystroke. The React port has none of that — the form
fields *are* the state (`useState` per field), a `draft: Profile` object is
built fresh every render, and `computeEnergy`/`macroTargetsFor`/`watchedNutrients`
run straight against it. The preview cannot drift from the fields because
there's no separate scrape step to fall out of sync.

Wired to both places that needed it: the header's profile button (previously
inert) and the Micros card's "set up your profile" nudge, which was deferred
to plain text in that PR specifically because this modal didn't exist yet —
now a real `onOpenProfile` callback.

One gap, deliberately: the baseline preview's "See how it was worked out"
link is dropped. It pointed at `openBaselineExpand`, the same damping-math
walkthrough modal deferred in the Trends card writeup above — no sense
duplicating that decision here.

`document.title` now syncs with the profile name (`useEffect` in `App.tsx`)
— a one-line piece of `updateDashboardTitle` that had no home until this
landed.

### Explainer sheets — done, and phase 4 is complete

Ports the `EXPLAINERS` registry (`src/lib/explainers.ts`, verbatim data,
23 entries — the count in an earlier draft of this doc said 26, which was
never actually right) plus the "What this means" bottom sheet that reads it.

The vanilla wired this with a single document-level capturing click listener
(`document.addEventListener('click', ..., true)`) that looked for any
`[data-explain]` element anywhere on the page, because the trigger buttons
live inside a dozen different unrelated components. That pattern doesn't
exist in React — the equivalent problem (many components need to open one
piece of shared UI, several layers apart) is what Context is for.
`ExplainerContext` holds which key is open and renders `ExplainerSheet`;
`useExplainer()` gives any component a one-line `open(key)` without prop-
drilling a callback through every card. `ExplainChip` (the small "i" icon)
and `ExplainTerm` (dashed-underline inline text) are the two trigger shapes,
matching the vanilla's `explain-chip`/`explain-term` split exactly.

Wired at all 10 spots that had a live trigger and a card to attach to:
Overview (energy balance, TDEE, deficit, macros, sleep score, HRV, RHR),
Micros (micronutrients, watch flags), Sleep (recovery), Trends (correlation,
consistency), and Profile (baseline, TDEE, diet styles, custom macros).
Clicking a "related" pill inside the sheet swaps its content in place rather
than stacking a second sheet, same as the original.

**Found while wiring this, fixed in the next section:** `plant_diversity` was
a registry entry (reachable from Fiber's and Micronutrients' related pills)
with no chip of its own — see below.

### Yogurt Protein & Plant Diversity vitals — done

The gap noted above: the vanilla's Card 1 folds a Greek Yogurt and a Plant
Diversity tile into the Overview card's Vitals grid, alongside Sleep/HRV/RHR.
Neither made it into `OverviewCard.tsx` in phase 3, so `plants_log` was
fetched by `useDashboardData` and never read, and the `plant_diversity`
explainer had no host until now.

`src/lib/vitals.ts` ports `computeYogurtStats`/`computePlantStats` as pure,
tested functions — `yogurtStatsFor` (matches `meal_items` by food name
containing "greek yogurt", not a dedicated category, same as the original)
and `plantStatsFor` (distinct botanical names logged in range).

One fidelity detail worth calling out: the vanilla updates these two vitals
*even when the range has no `daily_log` rows* — `renderOverview` calls
`updateYogurtVital`/`updatePlantsVital` in its early-return branch before
bailing on the rest of the card. They read `meal_items`/`plants_log` against
`getRangeDates`, entirely independent of whether `daily_log` has anything for
that range. `OverviewCard`'s "No data for this range" branch now renders
these two tiles too, rather than the whole vitals section disappearing
alongside the parts that genuinely have no data.

Deferred, same reasoning as everywhere else: the tap-to-expand views
(`openYogurtExpand`'s stat grid, `openPlantsExpand`'s per-plant list) — the
"· tap for more" / "· tap for list" captions that referred to them are
dropped rather than shown as dead affordances, matching the earlier decision
to drop the Macros heading's "· tap one for details" caption in the phase 3
port.

**Phase 4 is now complete** — every card from the vanilla dashboard has a
React port, plus the profile editor and the explainer sheets. What's
deliberately still missing, tracked for later:
- The tap-to-expand modal shared across every chart card (Micros, Activity ×4,
  Sleep ×2, Trends ×5, Yogurt, Plants) — deferred consistently since the
  Micros PR.
- The Overview macro tiles' tap-to-expand history charts
  (`openMacroExpand`/`openFiberExpand`), noticed while wiring this card's
  explainers but out of scope here for the same reason.

None of these block phase 5. The dashboard is functionally complete against
the vanilla's card set; what remains is depth on individual interactions.

## Phase 5: cutover

The code side is done. What actually changed:

- **`app.html` → `index.html`.** `git rm index.html && git mv app.html
  index.html`, so the rename is real git history, not a delete-and-recreate.
  The vanilla single-file dashboard `index.html` replaced is preserved at
  commit `c804533` — the last commit where it was still the live vanilla
  app. Tag it yourself if you want a named ref:
  `git tag pre-react-cutover c804533 && git push origin pre-react-cutover`.
  (This session's git credentials are scoped to push commits to the
  migration branch only — not arbitrary tags — so that had to be left to a
  human with full repo access.)
- **`vite.config.ts`** — dropped the `rollupOptions.input: 'app.html'`
  override. Vite now uses `index.html` at the project root as the entry by
  default, which is what a plain `npx vite build` needs to produce
  `dist/index.html` (verified: builds correctly, references
  `/Nutrition-Dashboard/assets/...` per the existing `base` config).
- **`.github/workflows/deploy.yml`** (new) — builds with `npx vite build` and
  deploys `dist/` via `actions/upload-pages-artifact` +
  `actions/deploy-pages`, triggered on push to `main`. `ci.yml`'s comment
  updated to point at it; `ci.yml` itself is unchanged and still only
  verifies.
- **The parity gate retired.** `scripts/parity.ts` and `npm run parity` are
  gone — see "The parity gate (retired at cutover)" above. `tsx` was only
  ever used to run that script, so it's dropped from `devDependencies` too
  (`node_modules`/lockfile regenerated clean, verified no other package
  depends on it).

### The one step this session cannot do — done, by a human

**Someone with repo admin access needed to flip Settings → Pages → Build and
deployment → Source to "GitHub Actions."** That happened at merge time as
planned above. The `deploy.yml` run against the merge commit completed
successfully (`actions_list` confirms `status: completed`, `conclusion:
success`), and the site is live at the React build. **Cutover is complete.**

### Costs paid, benefits realized

- The ~140-unit-test safety net stands on its own now — no more shadow
  vanilla implementation to diff against, which was always the plan (the
  parity gate's job was to make *this exact moment* safe, not to run
  forever).
- Every `npm run dev`/`npm run build` from here on is unambiguous: there's
  one entry, one app, one thing being built.
- GitHub's web-editor workflow for `index.html` is fully gone. Every future
  change goes through Node, a build, and the Actions deploy.

## Phase 6 progress: tap-to-expand modals

The first phase 6 item, and the thing every phase 4 card writeup deferred:
tapping a chart, a micronutrient tile, a macro tile, or the Yogurt/Plant
vitals now opens a full-size view — matching every `open*Expand` function
the vanilla had. One PR, all eight, since they share enough (the modal
shell, the "full axes" chart options) that doing them separately would have
meant re-deriving the same shell eight times.

### The shared shell

`ExpandModal.tsx` — backdrop + bottom sheet on mobile / centered dialog on
desktop, same visual treatment as `ProfileModal`/`ExplainerSheet` (this is
now the third time that shape has been built; if a fourth need for it shows
up, it's worth asking whether `ProfileModal` should be rebuilt on top of
`ExpandModal` rather than staying its own thing — not done here, out of
scope for this PR). Unlike `ExplainerContext`, there's no shared context:
each card owns its own "which thing is expanded" state, because expand
targets are local to one card, never referenced from another the way an
explainer term can be.

`chartOptions.ts` adds `fullScales`/`fullLegendLabels` — the vanilla's
`makeScales(false, extra)` — shared by every expanded chart across
Micros/Activity/Trends so the "zoomed" axis styling is one definition, not
four near-copies.

### Card by card

- **Micros** — tap a nutrient tile: RDA/Optimal bars (or the Target Range bar
  for Sodium/Boron/Omega-3), a food-vs-supplement split, and a 30-day history
  line chart. `microHistorySeries` in `micros.ts` is new: daily sums for one
  nutrient across *all* logged micronutrient rows, independent of the
  page's selected range — "history" is a different question than "today's
  average," same reasoning the vanilla gave for it.
- **Activity** — all 4 chart panels get real axes/legend. Nothing here
  changes chart *type*, only how much of the chart is visible.
- **Sleep** — the one genuine surprise porting this: tapping "Sleep
  Duration" doesn't zoom the bar chart, it opens a **different chart type**
  — a Sleep-hours-vs-HRV correlation scatter titled "Sleep vs Recovery".
  Tapping "HRV vs RHR" does the same for HRV-vs-RHR. This is exactly what
  the vanilla's `chartBuilders.sleep`/`.recovery` did
  (`build: (compact) => compact ? lineChart : scatterChart`) — a trend
  view compact, a relationship view expanded, because they're answering
  different questions. `scatterPoints` + `correlationCaption` (generic
  "r = X across N days" phrasing, distinct from `deficitWeightCaption`'s
  directional wording) land in `trends.ts`.
- **Trends** — Weight/Calories-vs-TDEE/Deficit get real axes; Deficit-vs-
  Weight (already a scatter compact) gains axis titles. Baseline Calibration
  is its own thing: tapping it opens every calibration row, newest first,
  each with the full stat table *and*, when the row has a real calibration
  window, the reconstructed arithmetic as a monospace block —
  `baselineWorkingFor` in `trends.ts` does the reconstruction
  (mean intake, weight trend, energy from tissue, implied baseline, the
  damping formula), tested against hand-computed numbers so the displayed
  math is verified, not just transcribed.
- **Overview** — the macro tiles (Protein/Carbs/Fat) open a contributors
  list; which shape depends on the selected range, matching
  `openMacroExpand`'s branch: a single day lists individual meals sorted by
  that macro, a multi-day range groups by meal description and shows the
  top 8 by total. New `src/lib/contributors.ts` holds
  `macroContributorsSingleDay`/`macroContributorsGrouped`. Fiber gets a
  simpler per-day list (fiber is only tracked as a daily total, never
  per-meal, so there's nothing to group). Yogurt and Plants reuse the
  `YogurtStats`/`PlantStats` already computed for their compact tiles — no
  new lib functions needed, just a stat-grid and a sorted list.

### Verification

Every one of these was exercised in a real browser against fixture data
covering every branch: single-day and multi-day macro contributors, a
micronutrient with 20 days of split food/supplement history, four sports'
worth of activities, a full calibration window for the baseline walkthrough.
Zero console errors, every number checked against what the fixture should
produce (e.g. two logged 453 g yogurt servings → 906 g total, 453 g/day
average, 1.0 tub).

### Bundle, measured

Gzipped JS: 155 KB → **159 KB**. Small, because this is mostly new markup
and logic reusing chart types already in the bundle — only the `Scatter`
chart type (Sleep's expanded views) and a bit more Chart.js surface were
new. Still comfortably under the vanilla's ~235 KB. Vite's build now flags
the main chunk as >500 KB *un-gzipped*, which is a hint that code-splitting
would help if this keeps growing — not acted on here, since the actual
transfer size is still fine and splitting is real effort for no user-facing
benefit yet.

### Still open (unchanged from before this PR)

- Animation, gestures (including the explainer sheet's swipe-to-dismiss),
  data entry, PWA — the rest of phase 6.
- The Yogurt/Plant vitals' own explainer coverage beyond `plant_diversity`
  (there's no `yogurt_protein` entry in the registry; the vanilla didn't
  have one either, so this isn't a gap introduced here).

## Post-tap-to-expand bugfixes (mobile Safari)

Four bugs reported after the tap-to-expand PR went live, all specific to
real iOS Safari (not visible in a fixed-size desktop headless browser):

- **Swipe dots never updated while swiping.** `App.tsx` toggled `active`
  only from a dot's own `onClick`; there was no listener on `.swipe-container`
  itself, so scrolling between cards by hand never moved the highlighted dot
  (a regression from the vanilla, which had a `scroll` listener driving
  exactly this). Added one, plus wired the dots' `onClick` to actually
  scroll the container (`scrollIntoView`) — previously a dot tap only
  changed the highlight without navigating.
- **Expand modals rendered low/cut off, and long lists were impossible to
  close.** Two compounding causes in `ExpandModal.tsx` (and the same
  shape in `ExplainerSheet.tsx`/`ProfileModal.tsx`): (1) the title and ×
  button lived inside the same `overflow-y-auto` container as the
  scrollable content, so scrolling a long list (Plant Diversity, Baseline
  Calibration) scrolled the close button off-screen with it — restructured
  to a `flex flex-col` panel with a `flex-shrink-0` header and a separate
  scrolling body; (2) the fixed overlay wrapper and the panel's
  `max-height` used plain `vh`, which on iOS Safari is sized to the *large*
  viewport (toolbar collapsed) even while the toolbar is actually showing,
  so the sheet could render partly below the visible screen with no way to
  scroll the page to reach it — switched both to `dvh`, which tracks the
  real visual viewport as the toolbar shows/hides.
- **Refresh button had no feedback.** It was plain text wired to `refetch`
  with no icon and no loading state — `useDashboardData()` only exposed
  `isLoading` (first-load only), not TanStack Query's `isFetching`
  (background refetches). Added an `isFetching` field to the hook and a
  spin-while-fetching refresh icon, matching the vanilla's
  `refresh-btn.spinning` treatment.

Verified with a Playwright pass using a constrained viewport (390×620, well
under the iPhone's full height) to approximate the toolbar-visible case:
confirmed the dot syncs on programmatic scroll, confirmed the modal's close
button stays reachable and clickable after scrolling a list's `scrollTop`
to its `scrollHeight`, and confirmed the refresh icon gains `animate-spin`
for the duration of a (mocked, delayed) fetch and loses it once settled.

## Phase 6: animation and gestures

Picked up next, ahead of data entry (deliberately deferred — no write path
to Supabase from the dashboard yet, on purpose) and PWA. Brings in
**Motion** (the renamed Framer Motion, `motion/react`), per the stack
table's original plan, for real spring physics and interruptible gestures
on the three bottom-sheet shells: `ExpandModal`, `ExplainerSheet`,
`ProfileModal`. Before this they mounted and unmounted with zero
transition — a regression from the vanilla, which faded/slid every one of
these in and out.

### Why AnimatePresence lives inside each shell, not at the call sites

Every caller conditionally renders these components (`{expanded &&
<ExpandModal .../>}`, `{openKey && <ExplainerSheet .../>}`,
`{profileOpen && <ProfileModal .../>}`), and there are ~8 call sites for
`ExpandModal` alone across five cards. Unmounting is what makes an exit
animation possible, and normally that means wrapping the conditional in
`AnimatePresence` at the call site — done eight times over here, since
`onClose` at every one of those sites is just `() => setX(null)`.

Instead each shell owns a local `show` boolean, starts `true`, and
`AnimatePresence` lives *inside* the shell wrapping its own backdrop +
panel. `handleClose` sets `show` to `false`; `AnimatePresence`'s
`onExitComplete` — which fires only once the exit animation has actually
finished — is what calls the real `onClose` prop the parent passed in. The
parent's unmount always was synchronous; by the time it happens the panel
is already fully off-screen, so removing it is invisible. This keeps the
change to three files instead of eleven, and every caller's `onClose` stays
exactly what it already was: state cleanup, nothing more.

One caller needed a small adjustment: `ProfileModal`'s Save button used to
call `onSave` and let the parent's `onSave` callback itself flip
`profileOpen` to `false`, closing the modal with no animation. `onSave` on
the `App.tsx` side is now just `setProfile` — closing is exclusively
`ProfileModal`'s own `handleClose`, called after `onSave(draft)`, so Save
exits through the same animation as every other close path.

### The drag-to-dismiss gesture

The vanilla only wired swipe-to-dismiss on the explainer sheet, gated on
`panel.scrollTop === 0` so the gesture never stole a scroll from long
content. Framer's `drag` prop and native scrolling don't mix well on the
same element — attaching `drag="y"` to a scrollable node means every scroll
attempt fights the drag gesture. Since the modal restructuring in the
previous PR already split every shell into a fixed header and a separately
scrolling body, the fix was cleaner than the scrollTop check: `drag="y"`
sits on the panel with `dragListener={false}` (nothing starts a drag by
default), and only the header — `ExpandModal`/`ProfileModal`'s title bar,
`ExplainerSheet`'s handle pill — calls `dragControls.start(e)` from its own
`onPointerDown`. The scrollable body never sees a drag gesture at all,
so this extends the gesture to all three shells (not just the explainer
sheet) with no scroll-conflict risk to guard against.

`dragConstraints={{ top: 0, bottom: 0 }}` with `dragElastic={{ top: 0,
bottom: 0.6 }}` gives the rubber-band-down feel without letting the panel
drag upward past its resting position. `onDragEnd` closes if the release
offset exceeds 90px or the release velocity exceeds 600px/s — a distance-or-
flick threshold, so a fast short flick dismisses same as a slow long drag.

### Escape-to-close and topmost-layer handling — a gap, not new scope

The vanilla closed the topmost open layer on Escape (an explainer opened
from inside the profile editor closes itself, not the editor beneath it)
and none of the three React shells had Escape wired at all. Since this PR
was already rewriting each shell's open/close lifecycle, leaving this
gap unfixed would have meant shipping keyboard-inaccessible modals on
purpose. `useEscapeKey` (`src/hooks/useEscapeKey.ts`) is a ~15-line shared
hook: each mounted shell pushes its close handler onto a module-level
stack and pops it on unmount, and Escape only invokes the top of the
stack — mount order doing the job of an explicit z-index check, since
whatever's layered on top was necessarily mounted most recently.

### Reduced motion

`MotionConfig reducedMotion="user"` wraps the whole app in `main.tsx` —
one line, and every `motion` animation everywhere (present and future)
collapses to a near-instant crossfade when the OS-level "reduce motion"
preference is on, without each shell needing to know about it.

### Verified

Playwright, driving real pointer events (`mouse.down`/`move`/`up` with a
short pause and per-step delay — instant single-jump moves don't register
as a drag gesture in the browser) against each shell: Escape closes the
topmost layer; header/handle drag past the threshold closes with the exit
animation playing through to unmount; Save closes `ProfileModal` through
the same animated path; swipe-dot sync and the refresh spinner (both from
the previous PR) still pass, no regressions; zero console errors throughout.

### Bundle, measured

Gzipped JS: 199 KB → **201 KB**. `motion` itself is larger than that delta
suggests — tree-shaking keeps this cheap because only `motion`,
`AnimatePresence`, and `useDragControls` are imported, not the library's
full feature surface (layout animations, SVG path drawing, exit variants
on `AnimatePresence` beyond what's used here, etc.).

### Still open

- Data entry — deliberately not started. No write path from the dashboard
  to Supabase yet, and that's on purpose: RLS/write policies aren't set up
  for it, so this isn't "next," it's blocked on a decision to open that up.
- PWA — manifest + service worker, installability, offline. Self-contained,
  no dependency on the above.
