---
name: Health Dashboard
description: A warm, glanceable instrument panel for daily nutrition, activity, sleep, and lab vitals.
colors:
  ground: "#181512"
  panel-fill: "#24201c"
  panel-fill-elevated: "#2e2924"
  panel-border: "rgba(255, 240, 220, 0.10)"
  ink: "#f4ebdd"
  ink-muted: "#c8bca8"
  interactive-blue: "#5e9fcf"
  interactive-blue-deep: "#487a9f"
  success-green: "#7cb76d"
  success-green-deep: "#567f4c"
  warning-amber: "#d79a52"
  warning-amber-deep: "#976c3a"
  danger-red: "#d07067"
  danger-red-deep: "#af5e57"
  reserved-purple: "#ba42a6"
  activity-teal: "#4fafad"
  highlight-gold: "#f0d38a"
  highlight-gold-deep: "#83734b"
  chart-run: "#cc342d"
  chart-ride: "#2090db"
  chart-walk: "#ac9221"
  chart-strength: "#ba42a6"
  garden-1: "#27391d"
  garden-2: "#3d552f"
  garden-3: "#547441"
  garden-4: "#88ab75"
  garden-surplus: "#b78842"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.15em"
  greeting:
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  heatmap: "2px"
  garden: "3px"
  pill: "10px"
  md: "12px"
  card: "14px"
  featured: "17px"
  sheet: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.interactive-blue-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "48px"
  button-primary-disabled:
    backgroundColor: "{colors.interactive-blue-deep}"
    textColor: "rgba(255, 255, 255, 0.6)"
    rounded: "{rounded.md}"
    height: "48px"
  button-ghost:
    backgroundColor: "rgba(255, 240, 220, 0.04)"
    textColor: "rgba(255, 240, 220, 0.7)"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "rgba(255, 240, 220, 0.04)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: Health Dashboard

## Overview

**Creative North Star: "The Warm Instrument"**

This is a dark, glanceable instrument panel for checking your own vitals — the density, the single-focus card carousel, and the tactile motion physics are unchanged from the system before this one. What changed is the surface: a true-black, fully achromatic "Night Shift Monitor" palette became a warm candlelit one, in a deliberate redesign toward a personal health journal you want to open every morning rather than a clinical readout. The mood is now **warm and disciplined** rather than cold and disciplined — precise and low-stimulation like before, but built from dark wood, warm paper, and candlelight rather than an OLED-black canvas.

This is a reversal of a prior explicit anti-reference. The previous system's "Do's and Don'ts" ruled out soft pastels, illustration, and rounded mascot-style graphics as the anti-reference (consumer wellness apps). That rule is overturned here, on purpose: the target is closer to *Apple-quality health information wrapped in a warm, living, comforting visual system* than to either a clinical monitor or a consumer wellness app. What survived the reversal is everything about **discipline** — the Signal Color Rule (amended, not dropped), the One Panel Tone Rule, the One Focal Moment Rule, the tight information density, and the refusal to let decoration outrank data.

Interaction is still **tactile and immediate** — tiles compress 3% on press, segmented controls and card-navigation dots are physically draggable with a spring-following pill, sheets drag-to-dismiss with real velocity. None of that changed. What's new is a single small seasonal footprint (a corner label, an accent-temperature shift) and one greeting header on the Today card — both deliberately minimal, for reasons the Login Scene and Season Mark sections below explain.

**Key Characteristics:**
- A warm near-black base with flat, hairline-bordered warm panels — depth comes from fill and border, same mechanism as before, now working against a weaker base contrast step (see Elevation & Depth).
- A small, meaningful bespoke accent palette (OKLCH-tuned, contrast-verified), used only to encode real state (on-target, watch, deficit/surplus) — never decoratively, per the amended Signal Color Rule below.
- A **separate, chart-only categorical palette** for activity types, validated independently with a colorblind-safe palette checker — the accent palette failed that same validation (see Colors > Chart Palette).
- Everything still reads as native-app chrome: system font stack for data, spring physics, bottom sheets — one display face is now permitted, confined to the greeting only (see Typography).
- Dense, glanceable typography unchanged: tiny bold uppercase labels over large bold numbers, almost no body prose.

## Colors

### Why this changed

The previous palette was true black (`#000000`) with fully achromatic neutrals, chosen deliberately for OLED contrast and to avoid any hue casting against pure black. That choice is overturned here. The cost is real and worth stating plainly: the flat lightness step from canvas to card measured **1.25:1** under true black, and measures **1.12:1** under the warm base — a genuinely weaker first depth cue, recovered instead through the warm border, the retained inset highlight, and the grain texture (see Elevation & Depth), not regained for free.

### Primary / Semantic

Every accent still has a **bright** tone for text, icons, borders, and thin fills, and a darker **deep** tone for solid fills that carry white text — same mechanism as before, all values re-derived rather than reused from the old palette:

- **Interactive Blue** (`#5e9fcf`, deep `#487a9f`): The one interactive/focus color, and doubles as "recovery" — sleep, HRV. Active tab state, links, input focus ring, the default progress-bar fill when a value is "how full" rather than good/bad.
- **Success Green** (`#7cb76d`, deep `#567f4c`): Positive state only — deficit, HRV stable, RHR normal, sleep score ≥ 75, a micronutrient at/above target.
- **Warning Amber** (`#d79a52`, deep `#976c3a`): Caution state — surplus, a "Worth Noticing" nutrient flag, an elevated reading.
- **Danger Red** (`#d07067`, deep `#af5e57`): Hard-low/critical state. **Corrected from a brief-supplied `#c96c63`**, which measured 4.47:1 against the card surface — under the 4.5:1 floor, on the *danger* color, in a health app. This value measures 4.77:1, with margin.
- **Reserved Purple** (`#ba42a6`): Reference/comparison only — the "Implied (undamped)" baseline line, the WeightTraining activity-type color. Shares its hex with Chart Strength below rather than forking a near-duplicate.
- **Activity Teal** (`#4fafad`): Weight and calorie trend lines, and the "Run" activity-type color — one neutral, unjudged hue for movement data.
- **Highlight Gold** (`#f0d38a`, deep `#83734b`): The seasonal/greeting accent. Confined to the greeting card and the season mark — never charts, lab values, macros, or navigation (see Typography).

### Chart Palette (separate from the accent palette)

Chart series get their **own** four-color categorical set, built directly in OKLCH and validated independently:

- `#cc342d` (Run), `#2090db` (Ride), `#ac9221` (Walk), `#ba42a6` (WeightTraining)

This exists because the six warm UI accents **failed validation as a chart palette** when this was checked rather than assumed: three read as gray (chroma below the colorblind-safe floor), and the worst adjacent pair measured ΔE 8.0 under *normal* color vision — indistinguishable before colorblindness even enters it. "Muted and natural" and "distinct enough for data visualization" are genuinely in tension; the fix is two palettes, not one compromise palette. The chart set passes lightness band, chroma floor, CVD separation (worst pair ΔE 8.4 deutan), normal-vision floor (ΔE 17.1), and contrast (all ≥ 3:1) — all four checks, together.

Green is deliberately **absent** from the chart palette: it's a status color (on-target, in-deficit) elsewhere in this system, and a color that means "good" must never also mean "cycling." This is the amended half of the Signal Color Rule below.

### Consistency Grid — Garden Ramp

The consistency grid uses its own sequential ramp, distinct from both accent and chart palettes: `#27391d → #3d552f → #547441 → #88ab75` (soil to sprout), plus `#b78842` for surplus days. Chroma here sits deliberately **below** the chart-categorical floor — this is a sequential scale, where monotonic lightness carries the deficit magnitude, and a ramp saturated enough to pass the categorical checks read as neon against the warm ground when first tried (a defect caught before shipping, not a taste call).

Surplus days carry a **different shape as well as a different hue** — a circle rather than a square (`.garden-cell--surplus`). This closes a real accessibility defect in the previous heatmap, independent of the palette change: status was encoded by hue alone (a green ramp vs. an amber flat color), which a red-green colorblind reader cannot separate. It's fixed now, for the same reason the chart palette exists — checked, not assumed.

### Neutral

- **Ground** (`#181512`): App background. The darkest surface in the system — no longer pure black.
- **Panel Fill** (`#24201c`): Card/tile background (`.glass-card`).
- **Panel Fill (Elevated)** (`#2e2924`): Bottom-sheet/modal panel background — unchanged in role from the previous system, retinted.
- **Panel Border** (`rgba(255, 240, 220, 0.10)`): The hairline that separates every panel from the background — warm-tinted rather than achromatic white, same job.
- **Ink** (`#f4ebdd`) / **Ink Muted** (`#c8bca8`): `body`'s default text color is now this warm off-white, not pure white — verified 15.4:1 on Ground, 13.7:1 on Panel Fill. Every existing `opacity-NN` secondary-text utility across the app inherits the warm tone through this one change, rather than needing a per-component edit.
- Row dividers (`border-white/[0.06]` etc.) deliberately stayed literal white-at-opacity — a different visual role (inactive-state hairlines, not the panel edge), and retinting ~20 call sites for an imperceptible warmth gain wasn't worth the diff.

### Named Rules

**The Signal Color Rule (amended).** Blue, green, and amber only ever appear because a value is being judged (good, watch, neutral-interactive) — unchanged. What's new: chart-categorical data (activity types) gets its **own** palette rather than reusing the judged accents, because a judged color (green = "good") must never double as a categorical label (green = "cycling"), and because the accent palette isn't chroma-rich enough to serve as a validated categorical set in the first place.

**The One Panel Tone Rule.** Unchanged: exactly one canvas tone and two panel tones — Ground, Panel Fill, Panel Fill Elevated — each with one job. The brief this redesign followed independently arrived at three surfaces too; the rule didn't need to change, only the values.

**The Bright/Deep Rule.** Unchanged mechanism. Every deep tone in this palette was re-derived and double-checked: white text clears 4.5:1 against the deep fill, **and** the deep fill itself clears 3:1 against the card — both checks, every accent, not eyeballed.

## Typography

**Body/Display/Label Font:** unchanged — the system font stack, no webfont loaded for data.

**One exception, new to this system:** a warm serif display face (`'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif`) is permitted, confined strictly to the Today card's greeting line. It is never used for charts, lab values, nutritional values, navigation, or any dense data card — the system font stack still carries every number in the app. The interface reads as warm because of the full visual system, not because of a novelty font; one line, in one place, is the entire footprint.

### Named Rules

**The Eyebrow-Over-Everything Rule (amended).** A card still leads with a tiny bold uppercase label, and so does every dense *tile* — that treatment is right where a compact label sits over a number. What changed: **section headers inside a card no longer use it.** They use `.section-label` (13px, weight 640, sentence case, full ink strength). Repeating the 10px uppercase `0.15em` treatment for the card title *and* every internal section made a dense card read as one uninflected drone, with no signal about which level of the hierarchy you were looking at. Sentence-case section heads give the card an internal structure the eyebrow alone could not.

Card names were also reviewed for tone and several renamed to plainer language where that added clarity without losing precision (Activity → Movement, Sleep & Recovery → Recovery, Trend Charts → Your Trends, Supplement Stack → Daily Support, Lab Results → Health Check, Micronutrient Analysis → Nutrition Details). "Macros" deliberately did **not** rename to "Nutrition" — anyone tracking protein already knows the word, and the vaguer alternative traded precision for a warmth that wasn't real.

**The Tabular Figures Rule.** Unchanged — `font-variant-numeric: tabular-nums` still applies everywhere a number is data.

## Layout

Unchanged. Single-column, mobile-first, and deliberately not a page: the app shell (header, time-range selector, card dots) is fixed, and exactly one full-height "card" is visible at a time inside a horizontally swipeable/draggable container (`.swipe-container` / `.swipe-card`, CSS scroll-snap). The page itself never scrolls — only the active card's own content does.

Internal card layout is a simple `grid-cols-2 gap-3` tile grid for stat groups, with full-width sections (heatmap, charts) breaking out to a single column. Card padding is consistently `p-5` (20px) at the section level and `p-4` (16px) at the tile level. Spacing rhythm is tight and consistent: `gap-3` (12px) between tiles, `mb-6`/`mb-8` (24px/32px) between major groups inside a card.

The Today card carries the fullest version of the internal hierarchy, and is the reference for it:

1. **Greeting header** — display face, date, season mark.
2. **Today's energy** — a featured/raised surface (`.feat-card`, 17px) for the hero readout.
3. **Macros** — four compact tiles (`.compact-card`, 13px), each showing value, progress, and the target it's measured against.
4. **Recovery** — Sleep / HRV / RHR, three across.
5. **Movement** — training burn and weight trend.
6. **Also tracked** — yogurt protein and plant diversity.
7. **Rhythm** — the consistency garden plus a plain-language summary.

Three radii do the structural work: 17px featured > 14px card > 13px compact tile. Recovery is a 3-column grid rather than 2 (all three values are short, and a 2-column grid leaves a hole on the third), matching the grid `SleepCard` already uses for the same three vitals.

The remaining six cards inherit the palette, the renamed titles, and the chart treatment, but keep their existing internal structure — the section-level rework above is Today-only for now.

Bottom sheets/modals (`ExpandModal`, `ProfileModal`, `ExplainerSheet`) reuse the same shell: full-width, anchored to the bottom on narrow viewports, becoming a centered `max-w-[560px]` dialog at `sm:` and above, with `env(safe-area-inset-bottom)` padding respected throughout for iOS home-indicator clearance.

## Platform Behavior

Unchanged from the previous system — none of this depends on the color palette.

The app loads at `initial-scale=0.9` (`index.html`'s viewport meta), not 1 — everything renders about 10% smaller/denser by default, closer to a manual pinch-out than the browser default. This is `initial-scale`, not a CSS `zoom` transform on an element, specifically because `visualViewport` — which `useVisualViewportHeight`/`useBodyViewportHeight` already read to keep the app shell's height correct — tracks the browser's real pinch-zoom scale, not an arbitrary element's own `zoom`. Using the mechanism the layout code already depends on means the 90% scale needs no separate compensation for height/layout math; it falls out of the existing `visualViewport`-driven sizing for free.

Text inputs are the one thing that *does* need compensating. iOS Safari's auto-zoom-on-focus fires when a focused input's **rendered** font size — after any active page scale — is under 16px, not the raw declared CSS value. At 0.9 scale, a plain `16px` input renders at 14.4px and would trigger it. `input, select, textarea { font-size: calc(16px / var(--pwa-initial-scale)) }` in `styles.css` declares them large enough that, once the 0.9 scale is applied, they land back at exactly 16px rendered. `--pwa-initial-scale` mirrors the meta tag's value by hand — CSS can't read an HTML attribute back, so **the two must be changed together**; there's a comment at each pointing at the other.

That input rule is unlayered plain CSS, so it wins over any Tailwind text-size utility regardless of specificity or source order — a future input that sets no size at all still lands at the compensated 16px-rendered floor instead of the browser default. A future input that genuinely wants to be larger needs its own unlayered override, the pattern `.login-field` and `.tile:hover` already use elsewhere for the same reason.

There's a second, independent backstop on top of the 16px-rendered floor: a small inline script in `index.html` adds `maximum-scale=1` to the viewport meta, but **only on iOS** (checked via `navigator.userAgent`). 16px-rendered is supposed to be sufficient on its own to stop the auto-zoom, but it's a real-device report of the zoom still happening despite that which prompted adding this — capping the zoom ceiling makes the zoom impossible outright regardless of why it was triggering, rather than relying on getting every contributing factor exactly right. It's iOS-only and JS-set rather than baked into the static meta tag because `maximum-scale=1` applied globally blocks pinch-zoom on Android too, a real accessibility regression (WCAG 1.4.4) that iOS's own auto-zoom quirk doesn't justify inflicting on a platform that doesn't have the bug. (Source: [Preventing iOS Textbox Auto-Zooming and ViewPort Sizing](https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing).)

What first looked like the same zoom issue recurring, from a real-device report of the sign-in card (and `ProfileModal`'s title/subtitle fields, since they share this same app-wide hook) getting yanked upward with a dead gap opening beneath it on focus, turned out to be unrelated to zoom at all: `useBodyViewportHeight` pins `body` to `visualViewport.height` to work around standalone-PWA `dvh` computing short (see that hook's doc comment) — but `visualViewport.height` also shrinks the instant the on-screen keyboard opens, in a plain browser tab too, and iOS already scrolls a focused field above the keyboard on its own. Applying the body-height override on top of that fought the browser's own adjustment. The fix is a focus guard: the override is skipped while `document.activeElement` is a form field, leaving keyboard-avoidance to iOS entirely, and resumes on blur once the shrink is actually the standalone-toolbar case the hook exists for. Covered by `e2e/viewport-focus.spec.ts`, which drives the same mechanism — a real `visualViewport` resize from an actual viewport size change — while a field is and isn't focused, since no CDP/Playwright driver can open a real iOS software keyboard to test against directly.

That focus guard traded one real-device bug for another: leaving `body` at its pre-focus (taller) height while the keyboard opens gives iOS's document-level "scroll the focused input into view" behavior something to actually scroll — and that behavior ignores `overflow: hidden` (already set on `body`), it scrolls regardless. For the sign-in screen, a single full-page view with nothing behind it, that scroll is invisible. For `ProfileModal` — a `position: fixed` overlay stacked on top of the dashboard, with its own backdrop meant to fully hide it — the scroll doesn't reliably respect `fixed` positioning during the keyboard's open transition, and the dashboard behind showed through the gap on a real device. `useScrollLock` (called from `ProfileModal` only — `ExpandModal` and `ExplainerSheet` carry no form fields, so the keyboard never opens over them) pins `body` to `position: fixed` for as long as the modal is mounted, removing it from the document's scrollable flow entirely: with nothing left to scroll, iOS is forced to resize the visual viewport instead, which the modal already tracks correctly. Covered by `e2e/modals.spec.ts`'s scroll-lock test, which asserts the lock's lifecycle directly (engaged on open, released on close) rather than trying to reproduce the keyboard scroll itself.

## Elevation & Depth

`.glass-card` still delivers on its name: a translucent fill (`color-mix` at ~82% opacity over transparent) plus `backdrop-filter: blur(20px) saturate(150%)`, so panels read as genuinely layered over the canvas rather than just a lighter flat fill. A 1px inset top highlight (`rgba(255,240,220,0.055)`) stands in for a light source catching the glass's top edge — same mechanism as before, retinted, and still the one `box-shadow` in the base card system.

**What's new:** the warm base measurably weakens the flat lightness step this all sits on top of — Ground → Panel Fill is 1.12:1 now vs. 1.25:1 under true black (see Colors > Why this changed). Depth here leans harder on three things instead: the warm border, the retained inset highlight, and a new ~1.5% film-grain texture (`.grain`, baked in as a `::before` pseudo-element so it paints behind real DOM children — including Chart.js canvases — without any z-index bookkeeping). Grain is applied to `.feat-card` only, not blanket-applied to every card: it's meant to be felt more than consciously noticed, and that only holds on the one surface per screen it's actually on.

`.feat-card` is the one raised-surface variant, used for the Today card's energy hero and nowhere else per screen: a linear gradient between Panel Fill Elevated and Panel Fill, 17px radius, the same inset highlight, plus one warm-tinted drop shadow (`0 10px 26px -16px rgba(12,8,4,0.55)`).

Cards still lift slightly on pointer hover (`translateY(-2px)` + a brightened border, gated to `(hover: hover) and (pointer: fine)`) — unchanged.

### Named Rules

**The Fill-Not-Shadow Rule (amended).** Depth still comes primarily from translucency + blur and a lightness step, not a generic drop-shadow. What's new: `.feat-card` carries one warm-tinted shadow (`rgba(12,8,4,...)`, not black) as a deliberate, scoped exception — the one raised surface per screen, never a generic "make this pop" fix, and never a plain black glow.

## Shapes

Radius now varies more deliberately by role than before:
- `2px` — heatmap-style barely-rounded squares (retained for reference; the consistency grid itself moved to garden cells).
- `3px` — consistency-garden cells (`.garden-cell`), softer than the old heatmap squares to read as "planted" rather than "data."
- `10px` — form controls and segmented-control pills.
- `12px` (`rounded-xl`) — buttons and the "Worth Noticing" callout box.
- `13px` — **new**: the compact stat-tile radius (`.compact-card`), one step tighter than the card holding it, so a tile grid reads as subordinate rather than as a field of equal peers.
- `14px` — the default card radius (`.glass-card`) — unchanged.
- `17px` — **new**: the featured-card radius (`.feat-card`), one step up from the default card, marking the Today card's energy hero as the one raised surface per screen.
- `20px` — bottom-sheet/modal panel corners (top corners only on the mobile bottom-sheet variant).
- `9999px` (full) — progress-bar tracks and fills, the swipe-dot indicator, pill-shaped badges, and **surplus** garden cells (a circle, not a square — see Colors > Consistency Grid).

## Components

### Buttons, Cards / Containers (`.glass-card`), Inputs / Fields, Modals / Bottom Sheets

Unchanged in mechanism and radius from the previous system — only the underlying token values changed (see the frontmatter `colors:` block and Colors above). `ExpandModal` and `ProfileModal`'s inline panel styles were updated to the new elevated-surface hex and warm border directly, since those two are literal inline styles rather than Tailwind utilities and don't pick up token changes automatically.

### Stat tiles and the macro colour split (new)

`.compact-card` tiles carry a small stroke icon (`StatIcon`, 12×12, one stroke weight, hand-rolled inline SVG) beside their label. Icons are always `aria-hidden` and always sit next to a real text label — never the sole carrier of meaning.

Macro tiles show the target alongside the value ("94% of 126g", or "Target met · 126g"), because a progress bar with nothing to measure against isn't readable. Their fill colour follows a deliberate split that the Signal Color Rule requires:

- **Protein and fibre are goals** — more is better, so hitting the target is a genuinely judged state and earns Success Green.
- **Carbs and fat are budgets.** There's no "good" number to land on, so colouring them at all would assert a judgement the data doesn't support. They stay on the neutral Activity Teal regardless of value, and specifically never go amber or red — being under a carb budget is not a failure and must not look like one.

### Rhythm summary (new)

The consistency garden is followed by a plain-language line derived from the same cells the grid renders ("Logged 61 of the last 84 days. Protein target reached 9 of the last 10."), via `rhythmSummary()` in `src/lib/trends.ts`.

Deliberately **counts, never an unbroken-streak number.** A streak that resets to zero on a single missed day converts a health log into a pressure device, which is the opposite of what this card is for — missed days stay neutral in the sentence exactly as they do in the grid. An absent figure (no protein target set, or no day in range recorded protein) is reported as absent rather than as a zero streak.

### Season Mark (new)

The entire in-app seasonal footprint. A small pill (`.season-mark`) in the Today card's greeting header: a glyph (leaf/sun/leaf/snowflake) plus the season name, driven by `currentCalendarSeason()` (`src/lib/season.ts` — written for the login scene originally, unused there by default, now wired up here). Plays a single ~500ms settle-in on mount (`.season-enter`) and is skipped outright under `prefers-reduced-motion`, not just frozen mid-flight.

This is deliberately **not** a reuse of `SeasonAmbience` / `useSeasonCycle` (see Login Scene, below) — no drifting particles, no crossfade, nothing that loops behind data someone reads every day. Slow, continuous ambient motion behind a screen you look at daily was considered and rejected: WWDC's own fluid-interface guidance flags looping oscillations near one cycle per five seconds as a vestibular-discomfort risk, and the login scene's own firefly pulse (3.7s) sits inside that band — tolerable for the few seconds someone spends signing in, a different proposition running indefinitely behind lab values. The seasonal footprint here is static by design: a corner label and nothing more.

### Greeting Header (new, Today card only)

A time-of-day greeting (`greetingForHour()`, `src/lib/format.ts`) plus today's date, in the one permitted display-face moment (see Typography), with the Season Mark alongside it. Deliberately **name-free**: `Profile` has no name field — `title`/`subtitle` are free-text header strings, and the dashboard is shared with a few other people per `PRODUCT.md` — so parsing a name out of an arbitrary title string would be a guess dressed up as personalization, not real specificity.

Deliberately **no daily-insight sentence** either, despite that being part of the original redesign brief. A generated observation about someone's HRV or calorie trend is a health claim in a product that also renders lab results, and it needs a deterministic rules layer with an explicit no-observation fallback before it ships — not a plausible-sounding line invented for this pass. Scoped out of this redesign; the greeting is the full extent of the "personality layer" that shipped.

### Login Scene (`AnimatedLoginScene`)

Still the one place in the app that isn't an instrument panel, and still the one place ambient particle motion and full-bleed seasonal art are allowed — see the Scene-Is-Not-Chrome Rule below, which is now scoped rather than absolute.

### Named Rules

**The Scene-Is-Not-Chrome Rule (amended, not repealed).** The login scene's full particle field, painted backgrounds, and crossfade cycle still never travel into the signed-in app — that boundary is intact. What changed: the signed-in app is no longer barred from *any* seasonal signal. It gets exactly one static one (Season Mark, above), on the one card that has a greeting. Everything else about this rule — the login scene's own motion, its exemption from the Signal Color Rule and instrument-panel restraint — is unchanged.

**The Fixed-Camera Rule.** Unchanged.

### Header Identity (title, subtitle, avatar)

Unchanged from the previous system.

### Explain Chip (signature component)

Unchanged.

### Navigation (card dots + range selector)

Unchanged in mechanism; colors retint automatically through the token system. Card order changed: Today, Recovery, Movement, Nutrition Details, Your Trends, Daily Support, Health Check — Recovery moved up from fourth to second, since it drives today's training decision more directly than Movement does.

### Charts (Chart.js line fills)

Unchanged in mechanism (`src/lib/chartGradient.ts`'s vertical `CanvasGradient`); every series color across every chart (weight/calorie trend, sleep-duration bars, HRV/RHR lines and scatters, activity-type bars/doughnut, micronutrient history) was re-pointed to the new accent or chart-categorical palette — see Colors above for which set governs which chart. Grid lines and tick labels in `chartOptions.ts` moved from achromatic white-at-opacity to warm-tinted `rgba(255,240,220,...)`, matching the rest of the system.

### Consistency Garden (formerly Consistency Heatmap)

Renamed in code (`ConsistencyHeatmap` component, `garden-cell` CSS) and in the accessibility fix it now carries: surplus days are a distinct hue **and** a circle rather than a square, so the deficit/surplus encoding survives grayscale and red-green colorblindness, not just full color vision. See Colors > Consistency Grid for the ramp itself.

### Entrance Motion (tile grids, chart panels, row lists)

Unchanged.

### Focus

Unchanged — the ring color inherits the new Interactive Blue automatically through the token system.

### Named Rules

**The One Focal Moment Rule.** Unchanged. `useAnimatedNumber`'s tick-to-value treatment stays on the Overview/Today hero readout only.

**The Never-Suppress-Focus Rule.** Unchanged.

## Do's and Don'ts

### Do:
- **Do** reserve Interactive Blue / Success Green / Warning Amber strictly for judged states (interactive, on-target, watch) — per the amended Signal Color Rule.
- **Do** use the deep tone, never the bright tone, any time an accent is a solid fill with text on top — per the Bright/Deep Rule.
- **Do** use the chart-categorical palette for chart series, never the judged accent palette — a color that means "good" must never also mean "cycling."
- **Do** encode status with shape as well as color anywhere color alone would fail a colorblind reader (see the Consistency Garden's circle/square split).
- **Do** keep every tap target ≥44px even when the visible element (chip, dot, close glyph) is much smaller, via padding or negative margins.
- **Do** give every interactive surface *some* physical feedback — a press-scale, a spring-follow, a drag-to-dismiss — never a flat, static state change.
- **Do** lead every card and every dense tile with a `.card-eyebrow`-style label before the value — and use `.section-label` (sentence case) for section headers *inside* a card, per the amended Eyebrow rule.
- **Do** show the target next to any progress bar; a fill with nothing to measure against can't be read.
- **Do** judge only what's actually a judged state — a budget (carbs, fat) gets a neutral tone, not a colour implying pass or fail.
- **Do** keep the system font stack for every number and every dense card; the one display face stays confined to the Today greeting.
- **Do** validate a palette with a colorblind-safe checker before shipping it as a chart series — don't reason about it by eye.

### Don't:
- **Don't** introduce a fourth dark neutral. There are exactly three (Ground, Panel Fill, Panel Fill Elevated), each with one job — per the One Panel Tone Rule.
- **Don't** reach for the default Tailwind palette for anything data- or state-related — every color must come from the token set above (bright, deep, chart, or garden), or it silently breaks the Signal Color Rule.
- **Don't** add a generic black `box-shadow` — the one exception (`.feat-card`'s warm-tinted shadow) is scoped and deliberate, not a precedent for adding more.
- **Don't** apply `.grain` broadly — it's meant to be felt, not seen, and that only holds when it's rare.
- **Don't** let seasonal motion loop continuously behind data someone reads daily — the Season Mark is static by design; if that changes, revisit the vestibular-discomfort reasoning in Season Mark above first.
- **Don't** write inline literal colors when a token + opacity utility already expresses the same thing — it silently forks the source of truth the moment the token's value changes.
