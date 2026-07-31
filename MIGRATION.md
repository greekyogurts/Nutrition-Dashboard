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
| 5 | Cutover: flip Pages to built output, delete `index.html`, tag the old one | **cutover** | code done; awaiting manual Pages source switch, see below |
| 6 | The payoff: animation, gestures, data entry, PWA | | |

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

### The one step this session cannot do

**Someone with repo admin access needs to flip Settings → Pages → Build and
deployment → Source to "GitHub Actions."** Until that happens, `deploy.yml`
can run and produce a build artifact, but Pages keeps serving whatever the
previous source was configured to serve — it does not self-activate.

Sequencing that matters: don't merge this PR to `main` and *then* leave the
Pages source on "Deploy from a branch" for any length of time. With the old
`index.html` gone, a branch-sourced Pages deploy would try to serve the new
`index.html` (which references bundled hashed assets under
`/Nutrition-Dashboard/assets/`, produced by a build step branch-deploy
doesn't run) — a broken page, not a graceful fallback. The switch should
happen essentially at the moment this merges: merge, flip the Pages source,
confirm the Actions deploy runs and the live site loads correctly. If
anything looks wrong, the fastest recovery is reverting the merge commit,
not troubleshooting Pages settings live.

### Costs paid, benefits realized

- The ~140-unit-test safety net stands on its own now — no more shadow
  vanilla implementation to diff against, which was always the plan (the
  parity gate's job was to make *this exact moment* safe, not to run
  forever).
- Every `npm run dev`/`npm run build` from here on is unambiguous: there's
  one entry, one app, one thing being built.
- GitHub's web-editor workflow for `index.html` is fully gone. Every future
  change goes through Node, a build, and (once the Pages source is switched)
  the Actions deploy.
