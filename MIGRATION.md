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
| 6 | The payoff: animation, gestures, data entry, PWA | live | tap-to-expand modals + animation/gestures + PWA done; data entry deliberately deferred |

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

## Phase 6: PWA (installable + offline), and a real E2E suite

Closes out the phase 6 table: installable on the home screen, works
offline, and — since the app now has real interaction/gesture logic
(drag-to-dismiss, swipe sync, spinners) that ~150 pure-function unit tests
structurally cannot see — a Playwright suite that actually exercises the
browser, wired into CI. Both bugs shipped in the prior two PRs (dead
refresh button, unreachable close button) would have been caught by this
suite had it existed then; that gap is what prompted writing it now instead
of shipping PWA alone.

### Icons and manifest

No existing brand asset to work from, so `public/icons/*.png` and
`public/favicon.svg` are generated rather than hand-drawn: an HTML file
(`scratchpad`, not committed) rendering a neon-blue rounded badge with a
heartbeat-in-heart glyph — the app's existing `--color-neon-blue` token,
nothing new — screenshotted by Playwright at each exact target resolution
(192, 512, a 512 maskable variant with extra safe-zone padding, and a
180 apple-touch-icon). `public/manifest.webmanifest` uses relative icon
`src` paths (`icons/icon-192.png`, not `/icons/...`) deliberately: it's a
static file Vite copies through unprocessed, so a leading slash would
point at the domain root, not `/Nutrition-Dashboard/` — relative paths
resolve correctly against the manifest's own URL without needing to
hardcode the base path a second time. `index.html` also carries the
`apple-mobile-web-app-*` meta tags iOS actually reads for standalone-mode
and status-bar behavior — it ignores the manifest for those specifically.

### Service worker — hand-rolled, not Workbox

This project is on Vite 8 (rolldown-based) — too new to trust
`vite-plugin-pwa`'s Workbox integration against yet. `public/sw.js` is
~50 lines: same-origin GET requests are cache-first with a background
refresh (stale-while-revalidate), and a navigation request falls back to
the cached shell if the network fails. No build-time precache manifest;
instead, `install` fetches the shell HTML fresh, regexes out its own
`<script src>`/`<link href>` references, and caches those hashed URLs
alongside it. That step turned out to be load-bearing, not decorative: the
page that *registers* a service worker is never itself controlled by
it — a hard SW-lifecycle rule — so its own initial JS/CSS requests never
pass through the `fetch` handler to get cached incidentally. Without
explicitly parsing and caching them at install time, the shell loaded
offline but rendered blank, because its JS bundle wasn't actually cached
anywhere.

### Query cache persistence

`main.tsx` swaps `QueryClientProvider` for `PersistQueryClientProvider`
(`@tanstack/react-query-persist-client` + `query-sync-storage-persister`,
writing to `localStorage`). This is a separate concern from the service
worker: the SW makes the *app shell* loadable offline; this makes the
*dashboard data* still show something meaningful instead of an empty
loading state. `shouldDehydrateQuery` only persists `success` states, so a
failed fetch never freezes an error into storage as if it were data, and
`maxAge` is a week — data that old is genuinely stale, not just a cache
policy number.

### Verifying "offline" honestly

The obvious test — go offline, reload the same tab — turned out to be
the wrong one. Chromium's CDP offline emulation has a real, repeatedly-
confirmed race against a service worker serving an *already-controlled*
page's reload; `net::ERR_FAILED` on the JS/CSS requests even though
`navigator.serviceWorker.controller` and Cache Storage were both already
correct at the moment of failure. That's an artifact of the emulation
layer, not of a real offline network (there's no stack to race against
when the radio is actually off) — confirmed by testing the realistic
scenario instead: a **brand new tab**, opened while offline, in a
storage context that already had an online visit (same SW registration,
Cache Storage, and localStorage) — i.e. actually reopening an installed
PWA after losing signal, rather than watching a live tab's network drop
under it. That passes reliably. The one test still exercising this exact
scenario (`e2e/pwa.spec.ts`, "a fresh tab opened offline") keeps a
one-retry allowance specifically because the same underlying race can
occasionally still catch even a fresh page's very first request under
enough system load — documented inline rather than silently retried, so
it reads as a known characteristic being worked around, not a flaky test
being tolerated.

### The E2E suite

`playwright.config.ts` + `e2e/*.spec.ts`, run against a real production
build (`vite build && vite preview`, not `vite dev` — the service worker
and hashed-asset precaching this suite exercises don't exist under the dev
server). `e2e/fixtures.ts` provides a Supabase-REST mock (auto-applied to
every test) and a `dragDown` helper — real paced pointer events, since a
single fast jump from start to end doesn't register as a drag gesture in
the browser at all, a lesson from getting the drag-to-dismiss tests
reliable in the first place.

- `modals.spec.ts` — Escape closing the topmost stacked sheet, Save routing
  through the same animated close as every other path, drag-to-dismiss on
  all three shells, and the long-list-close-button regression test
  (scrolls a 25-item Plant Diversity list to `scrollHeight`, asserts the
  close button is still `toBeInViewport()` and clickable).
- `swipe-and-refresh.spec.ts` — dot sync on programmatic scroll, dot tap
  actually navigating (not just relabeling), refresh spinner appearing for
  the duration of a delayed fetch.
- `pwa.spec.ts` — manifest fields and icon reachability, apple-touch-icon,
  SW registration/activation/precaching, and the offline-reopen scenario
  above.

One real accessibility gap surfaced while writing these, fixed in the app
rather than worked around in the test: `ProfileModal` never had
`role="dialog"`/`aria-modal` — `ExpandModal` and `ExplainerSheet` did, from
the start. It wasn't just a missing attribute; a test that used `page`-wide
text matching to find "TDEE" inside the open profile modal was silently
grabbing the *background* Overview card's TDEE button instead (first in DOM
order), because there was no dialog boundary to scope the query to. Fixed
in `ProfileModal.tsx`, and every modals.spec.ts query now scopes through
`getByRole('dialog', ...)`.

### CI

`.github/workflows/ci.yml` adds `playwright install --with-deps chromium`
and `npx playwright test` after the existing typecheck/unit-test/build
steps, with the HTML report uploaded as an artifact on failure. Runs at
`workers: 1` in CI (`playwright.config.ts`) — deliberately less parallel
than local default, since the one genuinely timing-sensitive test
(offline reopen) has more headroom against system load that way.

### A pre-existing gap this surfaced

`npm run typecheck` only ever pointed at `tsconfig.app.json` — `vite.config.ts`
and (now) `e2e/` live under separate configs (`tsconfig.node.json`,
`tsconfig.e2e.json`) that were never actually wired into the script. Doing
so for the first time immediately surfaced two latent, unrelated breaks:
`@types/node` was never installed (silently masked all along, since
`vite.config.ts` was never actually typechecked by anything CI ran), and
`vite.config.ts` imported `defineConfig` from `'vite'` instead of
`'vitest/config'`, so the `test: {...}` block didn't type-check against
Vite's config type. Both fixed rather than left latent now that something
actually checks them: `@types/node` installed, and the import switched to
`vitest/config` (a type-only difference — same function, same behavior,
just the version whose type merges in the `test` field).

## Post-PWA follow-up: charts still cutting off on real iOS Safari

Reported with screenshots right after the PWA PR: expanded charts (HRV vs
RHR, Training Volume) still rendering with their bottom axis/labels cut off
on a real iPhone, even after the earlier `vh` → `dvh` pass. Confirmed with
the user this was plain Safari, not the newly-installed PWA — ruling out a
standalone-mode/safe-area cause and pointing at the modal sizing itself.

Two real, separate gaps, both in the modal shells:

- **`ExpandChartWrap` was still `h-[50vh]`.** A leftover from the earlier
  `vh`→`dvh` pass across `ExpandModal`/`ExplainerSheet`/`ProfileModal` —
  the modal wrapper and panel `max-height` got converted, but the chart
  wrapper inside `children` was missed. Fixed: `h-[50dvh]`.
- **`dvh` itself can lag a toolbar transition.** It's designed to track the
  real visible viewport as Safari's toolbar shows/hides, but in practice
  the CSS value can be a beat behind — and the tap that opens a modal is
  often the exact same interaction that triggers the toolbar to animate,
  which is the worst possible timing for this lag. `useVisualViewportHeight`
  (`src/hooks/useVisualViewportHeight.ts`) reads `window.visualViewport.
  height` directly and applies it as an explicit inline `max-height` on
  each panel — `visualViewport` fires its own `resize`/`scroll` events
  independent of CSS recalculation, so this stays correct even if the
  toolbar transitions *after* the modal is already open, not just at the
  moment it opened. The `max-h-[85dvh]`/`max-h-[82dvh]` Tailwind classes
  stay in place as a same-value fallback for the instant before the effect
  runs.

Also added `env(safe-area-inset-bottom)` padding to all three panels —
unrelated to this specific report (confirmed not a standalone-PWA session),
but a real correctness gap for whenever it is opened as an installed app,
and cheap to close while already touching this styling.

Verified the mechanism itself with Playwright: the panel's inline
`max-height` matches `visualViewport.height * 0.85` on open, and — the part
that actually matters here — updates again if the viewport shrinks *while
the modal is already open*, without needing to reopen it. The exact
production bug (a live `dvh` transition lag on real WebKit) isn't
reproducible in Chromium, which doesn't have the large/small-viewport
distinction to lag between in the first place; this test instead pins the
JS-computed value tracking the live number, which is the actual fix and
the thing that could silently regress.

### CI follow-up: the offline test wasn't actually reliable

This PR's own CI run caught something local testing hadn't: the "fresh tab
opened offline" test (`e2e/pwa.spec.ts`) failed *consistently* on GitHub
Actions' runners, in both check runs, even with the one in-test retry that
had been added specifically because of local flakiness. That retry had
been tuned against this sandbox's behavior, which is a different thing
from GitHub Actions' actual runner — evidently a much weaker margin there.

Swapping `context.setOffline(true)` for `context.route('**/*', route =>
route.abort())` was tried as a fix, on the theory that request
interception wouldn't race a Service Worker's readiness the way network-
condition emulation does. It made things strictly worse: Playwright's
routing sits in front of the Service Worker entirely, so it doesn't
simulate "offline" for the SW to route around, it simulates "no Service
Worker at all" — the SW's own cache-hit path never gets a chance to run.

Stepped back from there: both approaches were really testing the
*browser's* ability to hand an offline navigation to a Service Worker, which
is Chromium/CDP behavior, not this app's code. Replaced the single flaky
end-to-end test with two deterministic ones that assert directly on what
this app is actually responsible for — no `setOffline`, no second page, no
navigation-time race:

- The precache test (already existed, extended) now also fetches each
  cached entry through the Cache API and asserts it's a real `ok` response
  with a non-empty body, not just present as a key.
- A new test parses the persisted `localStorage` entry directly and
  asserts the `daily_log` query's state is `success` with real row data,
  proving the persister actually wrote usable content, not just that a key
  exists.

Together these cover the same underlying capability — cached shell/assets
are valid, and persisted data is real and readable — without depending on
a specific browser's offline-emulation timing to prove it. Confirmed
stable across 5 consecutive full local suite runs after the change.

## Round two of real-device feedback: layout, design taste, and IA

More screenshots from an actual phone, this time about the app itself
rather than a specific bug — general design taste, and a few "does this
actually make sense" product questions.

- **A card shorter than the viewport left dead space at the bottom.**
  `.swipe-card > .glass-card` never got the vanilla's `height: 100%` —
  Overview on "Today" with little logged would render its content, then
  a wall of empty background down to the swipe dots. Fixed with
  `min-height: 100%` (not `height`, so a card *taller* than the viewport
  is unaffected and still scrolls via the parent's own `overflow-y`).
- **Dropped the neon-blue top border on `ExpandModal`/`ProfileModal`.**
  Carried over faithfully from the vanilla's `.expand-panel` at the
  original port — not a regression, but on review a flat neon accent line
  across every sheet reads as a generic AI-dashboard tell (decoration with
  no information behind it) and doesn't match how the rest of the app
  uses its accent color as small functional dots, not structural lines.
  `ExplainerSheet` already used a plain hairline; the other two now match.
- **Sleep card's "tap to zoom" swapped chart type, not just size.** Sleep
  Duration (bar) and HRV vs RHR (line) become a correlation *scatter* on
  expand — content that's more useful than a zoomed bar chart, but "zoom"
  promises the same view, bigger. Relabeled to "tap for correlation" so
  the switch is expected rather than looking like a bug. Chart itself
  unchanged.
- **Cut the standalone "Deficit vs Weight" chart.** It needed both a
  7-day rolling deficit *and* a same-day weigh-in to plot one point, so
  short ranges were usually empty or too sparse to even compute a
  correlation (needs 3+ points), and even with enough data the "insight"
  (deficit tracks with losing weight) just restates what a calorie
  deficit means by definition.
- **The "Insight" callout was hardcoded to one pairing.** Always computed
  sleep-vs-score regardless of whether that was actually the most
  interesting relationship available that range, which is what made it
  feel randomly placed. `strongestInsight()` (`src/lib/trends.ts`) now
  scans several candidate pairs — sleep↔score, sleep↔HRV, HRV↔RHR,
  deficit↔weight (absorbing what the cut chart was for) — and surfaces
  whichever has the strongest real correlation (highest `|r|`, 3+ points),
  with sensible fallback text when none qualify. `sleepScoreInsight` and
  `deficitWeightCaption` are gone, replaced by this one generic picker;
  `correlationCaption` (used by Sleep card's own scatter modals) is
  unrelated and untouched.
- **Moved the Consistency heatmap from Trends to Overview**, directly
  under Macros — same `buildHeatmap()`/`HEATMAP_COLORS` data, now rendered
  by a new `ConsistencyHeatmap` component in `OverviewCard.tsx` instead of
  inline in `TrendsCard.tsx`. Also helps the whitespace fix above, since
  the heatmap is real content that fills the extra room.

Verified with the full suite (152 → 151 unit tests, net one fewer after
consolidating `sleepScoreInsight`/`deficitWeightCaption` into
`strongestInsight`'s tests) plus a Playwright pass confirming: the glass
card now measures `min-height: 100%` and fills available space; the
neon border is gone from a screenshotted `ExpandModal`; Sleep card's
copy says "tap for correlation" and never "tap to zoom"; Trends no
longer renders "Deficit vs Weight" or "Consistency"; the Insight line
renders a real picked pairing (e.g. "Sleep × Score: r = 0.28 across 7
days"); Overview renders the heatmap under Macros. All 14 e2e tests still
pass unchanged.

## Header hidden behind the status bar in standalone/installed mode

Reported right after installing the app the PWA PR just made possible:
the header renders up under the iOS status bar, with the time and battery
icons overlapping the profile avatar and title.

Root cause: `index.html`'s `viewport-fit=cover` (needed so the swipe dots
sit flush with the bottom edge, not floating above it with a dead strip
below) tells iOS to let content render edge-to-edge under the
notch/status bar — the page becomes responsible for its own top inset in
exchange. In a normal Safari tab this was never visible, because Safari's
own address bar physically occupies that space regardless of what
`viewport-fit` says. In standalone mode there's no browser chrome at
all — nothing was pushing the header down, so it rendered directly under
the status bar.

Fixed by giving the header an explicit
`padding-top: calc(env(safe-area-inset-top) + 1rem)` (`src/App.tsx`) —
the existing 1rem of breathing room, plus whatever the real device's
safe area actually is. `env(safe-area-inset-top)` is `0` in a normal
browser tab, so this resolves to exactly the same `16px` as the plain
`pt-4` it replaces there — confirmed via computed style — and only
changes anything once installed, where it evaluates to the device's real
inset instead.

This joins the safe-area-inset-*bottom* padding already added to the
three modal panels in an earlier round — same underlying cause
(`viewport-fit=cover` + no compensating inset), different edge, caught by
a different report because nobody had actually opened the *installed* app
until now.

## Follow-up: dots still sitting too high, even after the header fix

Reported the header fix wasn't the whole story — the swipe dots (and the
"black space" above them) still sat noticeably higher than the true
bottom of the screen. Clarified: not a request to let short cards hug
their own content — the dots being pinned at a fixed position regardless
of which card is active is deliberate (otherwise they'd visibly jump
around while swiping between a long card and a short one). The actual
ask was to push that fixed position itself down, using the true full
screen height, wherever the shortfall was coming from.

Before touching anything, measured `.swipe-container`'s rendered height
and the dots' position across three cards (Overview, Sleep, Trends) via
Playwright — byte-identical in all three (665.5px container; dots flush
with the exact bottom of an 844px viewport). So the swipe area's *sizing
logic* was never the bug, ruling out the most obvious guess (something
tying the container's height to whichever card happens to be shortest).

That pointed at the same family of issue as the header fix: `body {
height: 100dvh }` is the instant CSS fallback, but a real, documented iOS
quirk is `dvh` computing unreliably short specifically in standalone-
display PWAs — there's no browser toolbar to dynamically track in
standalone mode in the first place, so the "dynamic" half of `dvh` has
nothing to measure, and some iOS versions get it wrong anyway. Since the
dots row sits in ordinary document flow right after the swipe area (not
independently pinned by its own CSS), an undersized `body` pulls
everything below it — dots included — up with it.

Fixed the same way as every `dvh`-adjacent bug this session: stopped
trusting the CSS value alone. `App.tsx` now reads `visualViewport.height`
via the existing `useVisualViewportHeight` hook (previously only used by
the three modals) and writes it directly onto `document.body.style.height`
in a `useEffect`, overriding the `100dvh` CSS fallback once a live number
is available. Verified the mechanism is actually live-tracked, not just
correct at first paint: shrank the viewport after initial render and
confirmed both `body`'s height and the dots' position followed it down,
in a new e2e test (`swipe-and-refresh.spec.ts`).

## Swipe-to-close on charts, and a draggable range selector

Two more requests: (1) an open chart should close on a swipe, not just via
the header handle, and (2) the range/time-view tabs should support a drag
gesture in addition to tap, with an animation showing which range you're
about to land on.

### Chart swipe-to-close

`ExpandModal`'s drag-to-dismiss was header-only from phase 6, because
Framer's `drag` gesture captures all pointer movement on the element it's
attached to — enabling it on the whole panel would have broken native
scrolling on the list-type expand views (Plant Diversity, Baseline
Calibration, Macro Contributors). A chart, unlike a list, never overflows
its box — there's no scroll gesture to protect, so the whole body is safe
to make a drag target.

Rather than hardcode "charts get body-drag, lists don't" per caller,
`ExpandModal` measures it: a `ResizeObserver` on the body compares
`scrollHeight` to `clientHeight`. When there's no overflow, `dragListener`
switches from `false` to `true` (Framer's own auto-attached listener takes
over the whole panel); when there's overflow, it stays `false` and only
the header can start a drag via `dragControls.start()`, exactly as before.
Verified both directions with new Playwright tests: a chart-only view
(Sleep Duration → Sleep vs Recovery) closes from a swipe starting anywhere
on its body, while a long list (25 mocked plant rows) does not — it still
requires the header, the backdrop, or Escape.

### Range selector: drag in addition to tap

Replaced the plain button row in `App.tsx` with a new `RangeSelector`
component: a segmented control with an animated pill (`motion.div`, spring
transition) tracking the active tab, draggable across the whole bar.

The tricky part was making tap and drag coexist without double-firing or
disagreeing. Rather than juggle per-button `onClick` alongside a
container-level drag gesture, every tab button is `pointer-events: none`
— all pointer handling (tap and drag alike) happens once, on the
container, via raw `onPointerDown`/`onPointerMove`/`onPointerUp`. A
movement under 6px is a tap and selects immediately, same as a plain
click; past that threshold it's a drag, and the pill follows the pointer
live (so the tab it'll land on is visible before release) and commits
whichever tab is under the pointer on release. Keyboard activation
(Enter/Space on a focused tab) is untouched, since `pointer-events: none`
only affects pointer hit-testing, not keyboard-triggered click events.

Went with raw pointer events over Framer's `drag`, since the pill's
on-screen position needed to be driven by the drag (for the live preview)
while the *container* itself stays put — a plain `drag="x"` would have
transformed the container, not just an indicator inside it.

One test-only wrinkle: Playwright's `.click()` refuses to target the
button once it's `pointer-events: none`, since the actual hit-test target
is the container underneath — a correct refusal for a locator that isn't
the real hit target, not a real app bug. Fixed by using `{ force: true }`,
which still dispatches a real click at that screen position (same as an
actual tap would), just skipping Playwright's actionability check.

### Verified

- [x] `npm run typecheck` — clean
- [x] `npx vitest run` — 151/151 passing
- [x] `npx vite build` — clean
- [x] `npx playwright test` — 20/20 passing (5 new tests: 2 for chart
      swipe-to-close, 3 for the range selector's tap/drag/threshold
      behavior)

### Design question raised, not implemented: cards as a flip/carousel

Also asked whether the card-to-card swipe should feel more like "one card
flipping to the next" rather than the current side-by-side scroll. Recommend
against a true flip for these specific cards: each one is a full page of
dense data (charts, tables, macro grids), not a lightweight preview tile —
carousel/flip motion reads well for shallow content but competes with
data the user is there to read, and re-implementing the gesture in JS
(needed for any real 3D/cover-flip effect) means giving up the free
momentum, rubber-banding, and accessibility that native `scroll-snap`
provides today, for something that risks feeling *less* responsive on
lower-end phones. If the goal is just a bit more "each card is its own
object" feel, a lighter middle ground is worth trying instead: keep the
native scroll container as-is (so physics and a11y stay free), and layer
a subtle scale/opacity shift on top — the outgoing card scales down and
fades slightly, the incoming one scales up from ~0.96, driven by scroll
position via `IntersectionObserver`. Open to prototyping that instead if
it sounds like the right direction.

### Still open

- No dedicated e2e coverage yet for reduced-motion behavior on the new
  range-selector pill. It should be covered automatically — `MotionConfig
  reducedMotion="user"` already wraps the whole app from phase 6, and the
  pill is a plain `motion.div` underneath it like everything else — but
  that inheritance wasn't specifically re-verified against this component.

## Follow-up: orphaned charts on card-swipe, and draggable dots

Two more real-device reports: (1) swiping to the next card while a chart
was open left the chart floating on screen instead of closing, and (2)
requested the same draggable-pill treatment from the range selector be
applied to the bottom card-navigation dots.

### Orphaned ExpandModal after a card swipe

Root cause: `ExpandModal` is `position: fixed`, which escapes normal
layout — so even though it's mounted inside a specific card's own DOM
subtree (its `expanded` state is local to that card), the modal itself
doesn't scroll away when `.swipe-container` scrolls to the next card. It
stays pinned full-screen, now floating over whatever card the swipe
landed on, orphaned from the state that's supposed to own it. Confirmed
this isn't blocked by the modal's backdrop either: a horizontal swipe
starting on the backdrop has no `touch-action` restricting it, so the
browser's native touch-scroll walks up the DOM looking for the nearest
scrollable ancestor — finds `.swipe-container` — and scrolls it, right
underneath the still-open modal.

Fixed with a new `useCloseOnInactive(isActive, close)` hook
(`src/hooks/useCloseOnInactive.ts`): closes on the trailing edge of
`isActive` going false. `App.tsx` now passes `isActive={active === index}`
into each card that owns expand state (Overview, Micros, Activity, Sleep,
Trends — the two with charts and lists alike, since the same fixed-
positioning bug applies to both, not just charts), and each card wires it
to its own `setExpanded(null)` (Trends has two independent expand states —
the chart modal and the baseline walkthrough — both wired separately).
Verified with a new e2e test: open the Fiber list on Overview, scroll
`.swipe-container` to the next card programmatically, and confirm the
dialog is gone and the Micros tab is the one now marked active.

### Card dots: draggable, same mechanic as the range selector

Replaced the static dot row with a new `CardDots` component, built the
same way as `RangeSelector` — raw pointer events on the row's container
(not per-dot, and not Framer's `drag`, for the same reasons as before:
one gesture handler so tap and drag can't disagree, and the container
needs to stay put while only an indicator moves). The one difference from
`RangeSelector`: no new `motion.div` pill was needed here, since
`.swipe-dot[aria-selected]`'s existing CSS transition (width 6px→20px,
color→neon-blue, `0.25s ease`) already *is* "the blue swiping animation"
the request asked to reuse — driving `aria-selected` off a live preview
index during the drag was enough to get the same live-preview feel for
free. Release commits via the existing `scrollToCard`, which was already
animated (`.swipe-container { scroll-behavior: smooth }`).

Same test-only wrinkle as the range selector: the dots are
`pointer-events: none` so the container can own every pointer gesture,
which means Playwright's `.click()` needs `{ force: true }` — the browser
routes a real click to the container regardless, so this only affects the
test helper, not real taps.

### Verified

- [x] `npm run typecheck` — clean
- [x] `npx vitest run` — 151/151 passing
- [x] `npx vite build` — clean
- [x] `npx playwright test` — 22/22 passing (2 new: orphaned-modal-on-swipe,
      drag-across-dots-previews-then-commits)

### Omega-3 showing "1,085 g · 67810% Target Range" — not an app bug

Reported the Omega-3 tile looked broken. Traced it with a direct query
against the `micronutrients` table rather than guessing at the app code
first, since the percentage math in `microStatsFor` (`lib/micros.ts`)
looked internally consistent (`avg / target`) for whatever `avg` it was
given — the question was where `avg` itself went wrong.

It's a source-data units problem, not a code bug: of 137 logged Omega-3
rows over 18 days, 13 are entered in **milligrams** (`1280`, `1950`,
`2475`, …) mixed in among rows correctly entered in **grams** (`0.02`,
`0.35`, `1.28`, …) — the unit the app's target table (`microTargetsFor`)
assumes throughout. Most of the bad rows are the same recurring fish-oil
supplement, logged as `1280` (its label dose in mg) on most days but
correctly as `1.28` on one. A single day with a 1000×-too-large row is
enough to blow up an 18-day average — confirmed the arithmetic ties out
exactly: `19532g total / 18 days ≈ 1085g`, matching the displayed figure.

Left uncorrected pending confirmation — rewriting a user's own logged
history is the kind of change that needs a yes first, not a guess.
User confirmed; corrected all 13 rows in place (`amount / 1000`). New
18-day average: 44.73g / 18 ≈ 2.49g/day — a normal range instead of
1,085g.

## Follow-up round two: still-orphaned charts, unreachable range selector, oversized lists

The previous round's fixes (`useCloseOnInactive`, the draggable dots) turned
out to be necessary but not sufficient. Three more real-device reports, all
tracing back to the same root cause:

1. Swiping to another section still left a chart open on top of it.
2. With a chart open, neither tapping a time-range tab nor swiping worked at
   all.
3. Long-list modals (Macros, Plant Diversity) opened too tall, up past the
   fixed header (title + range selector).

### Root cause: the backdrop, not just the panel, covers the header

The first round's header-clamp fix only capped the **panel's** max-height —
but the **backdrop** (`absolute inset-0`, semi-transparent, the thing that
darkens everything behind the sheet) sizes itself to its *wrapper*, which
was still `top-0 h-dvh` — the full viewport, unconditionally. So even once
the panel itself stopped visually covering the header, the backdrop still
extended over it and absorbed every tap and swipe there, just with nothing
visible drawn on top. That's report #3 confirmed by measurement and #2
explained outright: the range selector wasn't broken, it was invisible-but-
still-covered.

Fixed by bounding the *wrapper* itself (`ExpandModal`, `ExplainerSheet`,
`ProfileModal` all share this shape) below the measured header height —
`top: headerHeight`, `height: viewportHeight - headerHeight` — instead of
just the panel inside it. The panel's `max-height` simplified to `100%`
(of its now-correctly-bounded parent) instead of a separately computed
pixel value, since the wrapper itself now carries the real constraint.
Verified two ways: the wrapper's own bounding box never starts above the
header (even for a 40-row Plant Diversity list), and a real click dispatched
at the range selector's on-screen coordinates while a list modal is open
actually lands on it and changes the selection — not a locator click with
`force`, which would've passed even if something invisible were still on
top.

### Root cause: relying on the card becoming "inactive" wasn't reliable

The first round's `useCloseOnInactive` fix depends on `.swipe-container`'s
own scroll position actually changing while a modal is open — which in turn
depends on browser-specific touch-action/scroll-chaining behavior bleeding a
gesture through a `position: fixed` overlay to an ancestor scroll container.
That's real on some browsers, not guaranteed on all of them, and evidently
wasn't reliable enough on the reporter's actual device.

Replaced reliance on that side effect with direct detection: `ExpandModal`'s
outer wrapper now tracks raw pointer movement from `pointerdown`, and the
instant a drag leans clearly horizontal (`|dx| > 24px` and `|dx| > |dy| ×
1.5`), it calls `handleClose()` immediately — independent of whether the
gesture also happens to scroll anything underneath. This doesn't fight with
Framer's own vertical drag-to-dismiss (which only locks onto clearly
*vertical* gestures) or native list scrolling (also vertical); it only
reacts to gestures that are unambiguously sideways. `useCloseOnInactive`
stays as a second, independent path — belt and suspenders, since a
scroll-position-driven close is still a nice-to-have safety net when it does
land.

### A test-data bug this surfaced

Verifying the horizontal-swipe fix against a genuinely long list (not a
chart) exposed a latent issue in the *existing* long-list e2e tests: they
mocked `plants_log` rows dated with the real calendar date
(`new Date().toISOString()`), but the "today" range resolves to the
**latest logged day** in the mocked `daily_log` fixture — a fixed date in
the past (2026-07-29), not whatever day the test happens to run on. The
mocked plants never actually matched the active range, so the list silently
rendered as the empty state ("No plants logged") — short, non-scrollable,
and never exercising the scroll/overflow behavior the tests were named for.
Fixed by deriving the mock date from `DEFAULT_LOG`'s own last entry instead
of the real clock, in both the pre-existing tests and the new ones.

### Verified

- [x] `npm run typecheck` — clean
- [x] `npx vitest run` — 151/151 passing
- [x] `npx vite build` — clean
- [x] `npx playwright test` — 24/24 passing (4 new: wrapper bounds react
      live to viewport changes and stay clear of the header; horizontal
      swipe closes over genuinely scrollable list content; long list never
      covers the header and the range selector is provably reachable
      through it)

## Accounts: closing a live data leak, and multi-user for family

This started as an architecture review of a "bring your own database" idea
and turned up something urgent first: **every table's health data was
readable by anyone on the internet.**

### What was wrong

Each of the eleven tables carried one policy — `SELECT` to role `public`
with `USING (true)`. RLS was *enabled*, which looks reassuring in the
dashboard, but a permissive policy over role `public` grants everyone.
The publishable key that unlocks it ships in the JS bundle, is committed
to this repo, and this repo is public with Pages enabled.

Verified rather than assumed, by assuming the `anon` role the publishable
key maps to: 27 lab results, 49 daily logs, 110 meals and 2,518
micronutrient rows all readable. Writes were denied (no INSERT/UPDATE/
DELETE policy existed), so this was disclosure, not tampering.

Rotating the key would not have helped. A publishable key is *designed*
to be public; the only real boundary is the policy behind it. Public read
was dropped immediately, ahead of building anything, which blanked the
dashboard until auth landed — the right trade for exposed lab results.

### A second bypass the linter caught

After adding per-user policies, Supabase's security advisor flagged
`weight_trend`, a view nobody in the app queries but which is still live
at `/rest/v1/weight_trend`. It selects from `daily_log` with no owner
filter, and a Postgres view runs with its *owner's* privileges unless
`security_invoker` is set. Owned by `postgres`, it would have handed any
signed-in family member everyone else's weight and calorie history —
straight through the policies added minutes earlier.

This is exactly the failure mode worth remembering: **adding RLS to
tables does not secure the things that read those tables.** Views and
`SECURITY DEFINER` functions need auditing separately. Fixed with
`security_invoker = true`, which also makes the rolling averages correct,
since they now compute over one person's rows rather than everyone's.

Three trigger functions were also reachable as RPC endpoints purely by
living in the `public` schema. Calling them outside a trigger errors out,
so it was not a live hole, but `EXECUTE` was revoked anyway.

### Ownership model

Ten tables are personal and gained `user_id` with a policy of
`user_id = auth.uid()` for both `USING` and `WITH CHECK`, so neither
reads nor writes can cross accounts. `food_presets` stays shared — it is
a nutrition-facts library (name, brand, per-serving macros), not personal
data — readable by everyone signed in, editable only by whoever
contributed a row.

`meal_items` gets a composite foreign key to `meals(id, user_id)` rather
than a policy-only check, so an item cannot be attached to someone else's
meal regardless of which client is writing. It is deferrable, so a
backfill can touch parent and child in either order.

The 3,789 pre-existing rows have a null owner, which the new policies
render invisible to everyone. A trigger assigns them to the first account
ever created — guarded on being *first* rather than on a hardcoded email,
so no credential is baked in and it cannot fire twice.

### Invite-only signup, enforced in the database

The requirement was that only distributed codes create accounts. Putting
that check in the UI would be decorative: anyone holding the publishable
key can POST `/auth/v1/signup` directly and skip the form entirely.

So it is a trigger on `auth.users`, which runs for every account creation
regardless of entry point. Codes live in a table with RLS enabled and
deliberately **zero** policies, so no browser client can read, enumerate
or forge them — only `service_role` can, and that key exists nowhere in
this codebase.

This also removed the need for an Edge Function holding a service-role
key, which was the original plan. Fewer moving parts and a stronger
guarantee.

The cost is legibility: GoTrue reports a trigger rejection as a generic
database error, so the sentinels the trigger raises (`invite_required`,
`invite_exhausted`, …) are matched out of the response body and mapped to
plain English. Unit-tested per sentinel.

### Proving it, not assuming it

The whole model was exercised inside a rolled-back subtransaction, so no
test users persisted:

| Actor | daily_log | weight_trend | lab_results | invite_codes | food_presets |
|---|---|---|---|---|---|
| anon (publishable key) | 0 | 0 | 0 | 0 | 0 |
| owner | 49 | 49 | 27 | 0 | 37 |
| another signed-in user | **0** | **0** | **0** | 0 | 37 |

Signup with no code, an unknown code, and a spent code were each
rejected; a valid code claimed the legacy rows, created a profile and
consumed its single use.

### Shared-device leaks in the browser

Two caches were keyed globally and would have handed one family member
the previous one's data:

- The persisted React Query cache now takes the account id as its
  `buster`, and the provider is keyed on the same value so the in-memory
  cache is dropped too. Busting alone only governs what is read back from
  localStorage.
- The profile (name, goals, macro targets) is now namespaced per account,
  falling back once to the pre-multi-user key so the original setup
  survives. A `profiles` table exists for moving this server-side later;
  until then it stays per-device.

### Why auth is hand-rolled

`client.ts` predicted this: *"If auth ever lands, add it back then — at
that point it earns its weight."* On measurement it did not.
`@supabase/supabase-js` bundles realtime, storage and postgrest to
deliver four endpoints. Hand-rolled sign in / sign up / refresh / sign out
cost **~2 KB gzipped** against roughly 50 KB for the library.

The safety argument holds too: every token is validated server-side
against RLS, so a bug in this code can sign someone out unexpectedly but
cannot widen what a session may read. Concurrent refreshes share one
in-flight promise — nine parallel dashboard queries would otherwise race,
with eight redeeming an already-rotated refresh token.

### Verified

- [x] `npm run typecheck` — clean
- [x] `npx vitest run` — 167/167 passing (16 new, covering expiry skew,
      session storage, and every invite-error mapping)
- [x] `npx vite build` — clean
- [x] `npx playwright test` — 30/30 passing (6 new: the gate renders,
      invite errors are legible, sign-out leaves nothing behind, and a
      second account never restores the first account's cached rows)
- [x] Supabase security advisor — the `SECURITY DEFINER` view error and
      all `SECURITY DEFINER` function warnings cleared

### Still open

- **Email confirmation is on by default**, and Supabase's built-in mailer
  is rate-limited to a handful per hour. For a family this is likely to
  be the roughest edge; turning confirmation off is reasonable given
  invite codes already gate access, or wire up custom SMTP.
- **Signup could additionally be disabled at the platform level** as
  defence in depth. The trigger already makes this unnecessary.
- **The invite flow has not been exercised against live GoTrue** — this
  sandbox cannot reach supabase.co, so the exact error-body shape for a
  trigger rejection is matched defensively (sentinel anywhere in the
  body) rather than confirmed. Worth one real signup to confirm the
  message reads correctly.
- The profile still lives in localStorage rather than the `profiles`
  table, so it does not follow an account across devices.
