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
- The dashboard (`index.html`) fetches directly from Supabase (`SUPABASE_URL` + a publishable client key) via PostgREST and renders charts client-side (Chart.js-style canvases: line, bar, pie, scatter, radar, polar, bubble).
- Sections observed in the current build: nutrition stats (calories, protein, carbs, fat, fiber, deficit), micronutrients, activity (heart rate, burn, recovery, sleep, volume, type breakdown), a calendar heatmap, trends, labs, supplements, takeaways, and a "yogurt" section.
- Hosted as a static HTML file on GitHub; also installed as a home-screen PWA on Ben's phone (`apple-mobile-web-app-capable`, standalone theming already present).

## Capabilities and Constraints

- Single self-contained `index.html` (no build step, no framework tooling in the repo) — future work should preserve the ability to host/open it as a static file.
- Must keep working when installed as a standalone PWA on iOS.
- Backend is Supabase accessed with a publishable/anon key directly from the client; there is no server-side code in this repo today.
- Open decision, not yet committed: whether/how to evolve this into a multi-user product where each user connects their own LLM and database. Treat as a possible future direction, not a current requirement.

## Evidence on Hand

- The only substantive file in the repo is `index.html` (~1,760 lines); `README.md` currently has only a title.
- No sample data, screenshots, or written brand guidelines are on hand beyond what's inferable from the live markup/section names above.

## Product Principles

1. Preserve the no-backend, static-file architecture and its live Supabase read path — don't introduce a required build step or server without a reason tied to the multi-user direction.
2. Keep the PWA/installed-on-phone experience working; this is used as a daily-glance tool, not just a desktop dashboard.
3. Favor a fast, conversational logging workflow (via Claude → Supabase) over building out manual data-entry UI, unless the user asks for that explicitly.
4. Treat "open this up to other users with their own LLM/DB" as a real but undecided future direction — don't quietly design as if it's already a multi-tenant product.
