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
| 3 | App shell + Overview card; local parity comparison; CI build step | untouched | next |
| 4 | Remaining cards, one PR each: Micros, Activity, Sleep, Trends, Supplements, Labs, profile, explainers | untouched | |
| 5 | Cutover: flip Pages to built output, delete `index.html`, tag the old one | **cutover** | |
| 6 | The payoff: animation, gestures, data entry, PWA | | |

### Important correction to the original plan

An earlier draft proposed deploying phase 3 side-by-side with the live site for
comparison. **That isn't possible.** A GitHub Actions Pages deploy requires
switching the Pages source away from the branch, which immediately stops serving
`index.html`. So:

- Parity comparison happens **locally** (`npm run parity`).
- Pages source is flipped **once**, at phase 5.
- `.github/workflows/ci.yml` deliberately does not deploy. The deploy workflow
  arrives with phase 5.

## The parity gate

`npm run parity` loads the live `index.html` in a headless browser and the new
typed modules in Node, feeds both **byte-identical fixture data copied from
production**, and diffs every derived number.

Currently: **75 derived values across 15 profile shapes, zero drift.**

This is the migration's safety net. A rewrite that quietly changes someone's
calorie target is worse than no rewrite. Run it before and after every phase.

## What exists now

```
src/data/
  database.types.ts  Generated from the live schema
  wire.ts            Widens `numeric` columns to what PostgREST really sends
  client.ts          Typed supabase-js client
  fetch.ts           Paged fetchers; fetchAllPages is separately testable
  queries.ts         useDashboardData — parallel queries, independent failure
src/lib/
  types.ts       Raw (wire) vs normalized domain types + coercion boundary
  profile.ts     Profile, GOALS, profileAge, currentWeightLb
  baseline.ts    normalize*, baselineOn, latestBaseline, tdeeForRow, meanTdee
  energy.ts      computeEnergy — baseline + burn, no BMR formula
  macros.ts      DIETS as a discriminated union, macroTargetsFor
  micros.ts      microTargetsFor (sex/age RDAs), RESTRICTIONS, watchedNutrients
  fixtures.ts    Real production rows, string numerics included
  *.test.ts      49 unit tests, ~380ms
scripts/
  parity.ts      The gate described above
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
- **Pages deploy changes** at phase 5 (currently serving the branch root; there
  was no `.github/workflows` before this).
- **`base: '/Nutrition-Dashboard/'`** in `vite.config.ts` — this is a project
  page, not a user page. Wrong base 404s every asset while `index.html` still
  loads, which looks like a blank app rather than a config error.

## Porting notes for later phases

- The existing Playwright suites in the scratchpad test behaviour through the
  DOM and largely survive. But calls like
  `page.evaluate(() => computeEnergy(profile))` will not — module scope isn't
  global once bundled. Those become Vitest unit tests, which is where they
  belonged.
- The explainer registry (26 entries) is already pure data and ports verbatim.
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
