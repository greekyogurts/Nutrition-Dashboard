# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is Ben, tracking his own nutrition, activity, labs, and supplements. A few other people (family/friends) also view or use the dashboard today. There is an explicitly undecided future direction to open this to other users who would bring their own LLM and database — not built yet, recorded here only as a direction, not a current capability.

## Product Purpose

A personal health dashboard that aggregates and visualizes nutrition (calories, macros, micronutrients), activity/training, lab results, and supplements, so Ben can see trends, deficits, and takeaways at a glance instead of digging through raw logs.

## Positioning

Data entry happens conversationally: Ben logs meals to Claude, which writes structured rows into a Supabase database. Some activity data syncs from apps (e.g. Strava). The dashboard is a Vite-built static-output SPA that reads live from Supabase over its REST API — there is no custom backend server.

## Operating Context

- Daily workflow: Ben logs food to Claude in conversation; Claude writes the parsed entries to Supabase. Activity data is synced from training apps. Lab results and supplements appear to be entered directly.
- The dashboard is a React 19 + TypeScript + Vite single-page app (`src/`), built with `npm run build` and served as static output — not the earlier no-build `index.html`. It fetches directly from Supabase (`SUPABASE_URL` + a publishable client key) via PostgREST and renders charts client-side via Chart.js (`react-chartjs-2`), vendored through npm rather than loaded from a CDN at runtime.
- UI model: a single-screen, mobile-first swipeable card carousel (`.swipe-container` / `.swipe-card`), one card per topic — Today (energy balance, macros, vitals), Recovery, Movement, Nutrition Details (15 tracked micronutrients), Your Trends, Daily Support, and Health Check — with a dot strip below for position/navigation and a shared time-range selector (Today / Last 7 / 30 Day / YTD / All / custom date) above.
- Visual system: a warm dark theme (candlelit surfaces, translucent glass cards, a validated warm accent palette plus a separate colorblind-safe chart palette) — see `DESIGN.md` for the full token system and its rationale.
- Built as a PWA (`public/manifest.webmanifest`, `public/sw.js`, install icons) and hosted as static output on GitHub Pages (`greekyogurts.github.io/Nutrition-Dashboard`).

## Capabilities and Constraints

- Vite build step required (`npm run build`); no framework-free static-file mode anymore. Dev via `npm run dev`, typecheck via `npm run typecheck`, unit tests via `npm test`, e2e via Playwright (`e2e/`).
- Backend is Supabase accessed with a publishable/anon key directly from the client; there is no server-side code in this repo today.
- The app carries `apple-mobile-web-app-capable` / `theme-color` / apple-touch-icon tags and supports "Add to Home Screen" in standalone mode with a custom icon.
- Chart.js is a bundled npm dependency, not a CDN script — the earlier "CDN script fails to load" fragility risk no longer applies.
- Open decision, not yet committed: whether/how to evolve this into a multi-user product where each user connects their own LLM and database. Treat as a possible future direction, not a current requirement.

## Evidence on Hand

- Source lives under `src/` (components, `lib/`, `data/`, `state/`, hooks), with `DESIGN.md` as the source of truth for the visual system and `MIGRATION.md` documenting the move off the earlier single-file build.
- No sample data, screenshots, or written brand guidelines are on hand beyond what's inferable from the live markup/section names above.

## Product Principles

1. Preserve the no-backend, static-file architecture and its live Supabase read path — don't introduce a required build step or server without a reason tied to the multi-user direction.
2. This is a daily-glance, mobile-first tool (current build is a swipeable single-screen card UI) — design and test for phone-sized viewports first, not just desktop.
3. Favor a fast, conversational logging workflow (via Claude → Supabase) over building out manual data-entry UI, unless the user asks for that explicitly.
4. Treat "open this up to other users with their own LLM/DB" as a real but undecided future direction — don't quietly design as if it's already a multi-tenant product.
