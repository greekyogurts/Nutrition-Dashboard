# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is Ben, tracking his own nutrition, activity, labs, and supplements. A few other people (family/friends) also view or use the dashboard today. There is an explicitly undecided future direction to open this to other users who would bring their own LLM and database — not built yet, recorded here only as a direction, not a current capability.

## Product Purpose

A personal health dashboard that aggregates and visualizes nutrition (calories, macros, micronutrients), activity/training, lab results, and supplements, so Ben can see trends, deficits, and takeaways at a glance instead of digging through raw logs.

## Positioning

Data entry happens conversationally: Ben logs meals to Claude, which writes structured rows into a Supabase database. Some activity data syncs from apps (e.g. Strava). The dashboard itself is a static, no-build HTML page that reads live from Supabase over its REST API — there is no custom backend server.

## Operating Context

- Daily workflow: Ben logs food to Claude in conversation; Claude writes the parsed entries to Supabase. Activity data is synced from training apps. Lab results and supplements appear to be entered directly.
- The dashboard (`index.html`, titled "Ben's Health Dashboard") fetches directly from Supabase (`SUPABASE_URL` + a publishable client key) via PostgREST and renders charts client-side via Chart.js.
- UI model as of this build: a single-screen, mobile-first swipeable card carousel (`#swipeContainer` / `.swipe-card`), one card per topic — Overview (energy balance, macros, vitals), Micronutrient Analysis (15 tracked nutrients), Activity, Sleep & Recovery, Trend Charts, Supplement Stack, and Lab Results — with a dot strip below for position/navigation and a shared time-range selector (Today / Last 7 / 30 Day / YTD / All / custom date) above. A glassmorphic dark theme (blurred translucent cards, neon accent colors) replaces the earlier sectioned/table layout.
- Styling and charting are loaded from CDNs at runtime (`cdn.tailwindcss.com`, `cdn.jsdelivr.net/npm/chart.js`) rather than vendored inline, unlike the previous build.
- Hosted as a static HTML file on GitHub Pages (`greekyogurts.github.io/Nutrition-Dashboard`).

## Capabilities and Constraints

- Single self-contained `index.html` (no build step, no framework tooling in the repo) — future work should preserve the ability to host/open it as a static file.
- Backend is Supabase accessed with a publishable/anon key directly from the client; there is no server-side code in this repo today.
- This build's `<head>` no longer carries the `apple-mobile-web-app-capable` / `theme-color` / apple-touch-icon tags the previous build had — "Add to Home Screen" on iOS still works but without standalone (fullscreen, no Safari chrome) mode or a custom icon. Recorded as an observed fact, not a requirement to restore; ask Ben before treating this as something to fix.
- The page calls `new Chart(...)` synchronously at load for every chart, with no guard for the CDN script failing to load (ad blocker, network hiccup, CDN outage) — that throws and halts the rest of the startup script, including the Supabase data fetch. Noted as a real fragility risk, not fixed here (would mean vendoring Chart.js or adding a load guard — a bigger call than this pass's scope).
- Open decision, not yet committed: whether/how to evolve this into a multi-user product where each user connects their own LLM and database. Treat as a possible future direction, not a current requirement.

## Evidence on Hand

- The only substantive file in the repo is `index.html` (~1,610 lines as of this build); `README.md` currently has only a title.
- The repo has moved through several "Add files via upload" commits directly on `main` (i.e. content pushed straight to GitHub, not through a feature-branch/PR flow) — treat `index.html` as likely to change again outside of any given working branch; re-check it's still current before doing further design work.
- No sample data, screenshots, or written brand guidelines are on hand beyond what's inferable from the live markup/section names above.

## Product Principles

1. Preserve the no-backend, static-file architecture and its live Supabase read path — don't introduce a required build step or server without a reason tied to the multi-user direction.
2. This is a daily-glance, mobile-first tool (current build is a swipeable single-screen card UI) — design and test for phone-sized viewports first, not just desktop.
3. Favor a fast, conversational logging workflow (via Claude → Supabase) over building out manual data-entry UI, unless the user asks for that explicitly.
4. Treat "open this up to other users with their own LLM/DB" as a real but undecided future direction — don't quietly design as if it's already a multi-tenant product.
