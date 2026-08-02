---
name: Health Dashboard
description: A dark, glanceable instrument panel for daily nutrition, activity, sleep, and lab vitals.
colors:
  night-base: "#000000"
  panel-fill: "#1d1d1d"
  panel-fill-elevated: "#262626"
  panel-border: "rgba(255, 255, 255, 0.08)"
  monitor-blue: "#00afe7"
  monitor-blue-deep: "#067396"
  vital-green: "#33d977"
  vital-green-deep: "#227c45"
  alert-amber: "#f98f3a"
  alert-amber-deep: "#a25e2b"
  critical-red: "#ed5350"
  critical-red-deep: "#b24743"
  reserved-purple: "#b28fef"
  data-cyan: "#41b2b2"
  data-indigo: "#4b74d8"
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
rounded:
  pill: "10px"
  md: "12px"
  card: "14px"
  sheet: "20px"
  full: "9999px"
  hairline: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.monitor-blue-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "48px"
  button-primary-disabled:
    backgroundColor: "{colors.monitor-blue-deep}"
    textColor: "rgba(255, 255, 255, 0.6)"
    rounded: "{rounded.md}"
    height: "48px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "rgba(255, 255, 255, 0.7)"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: Health Dashboard

## Overview

**Creative North Star: "The Night Shift Monitor"**

This is a dark, glanceable instrument panel for checking your own vitals, not a marketing surface or a productivity app. Every screen is built to be read once, at a glance, often in low light — the true-black base (`#000000`), flat dark panels, and a small, bespoke accent palette exist so the eye lands on the one number or bar that changed, not on the chrome around it. True black rather than a tinted near-black is a deliberate OLED choice: those pixels are actually off, which reads as deeper black and costs nothing to render. The neutrals are fully achromatic (zero chroma) for the same reason — any hue in the canvas or panels would show up as a visible cast against true black. The mood is **warm but disciplined**: precise and low-stimulation like a well-designed medical readout, but with room for a little personality in copy and micro-interactions (the yogurt card's "the tub never lies") rather than clinical coldness throughout — the warmth lives in the caution accent and the copy, not in the neutrals.

Interaction is **tactile and immediate**. Nothing here behaves like a static webpage: tiles compress 3% on press, segmented controls and card-navigation dots are physically draggable with a spring-following pill, and sheets/modals drag-to-dismiss with real velocity. The visual restraint is deliberate, not a placeholder for "more design later" — density and speed of reading are the product.

**The one authored focal moment** is the Overview card's hero readout: calories, TDEE, and the deficit/surplus number tick toward a new value together over ~600ms, like an instrument settling on a reading, instead of snapping on every range change or data refresh (`useAnimatedNumber`). It's deliberately scoped to that one readout — the number the whole app exists to show — rather than applied generically to every stat on the page; see the Named Rule under Components.

Explicitly not this: a consumer wellness app. No soft pastels, mascot illustrations, rounded card stacks with drop shadows, or motivational-poster energy. If a screen would look at home in a step-counter app's onboarding flow, it's off-brand here.

**Key Characteristics:**
- Near-black base with flat, hairline-bordered dark panels — depth comes from fill and border, not shadow (for now — see Elevation & Depth).
- A small, meaningful bespoke accent palette (OKLCH-tuned, no longer a copy of iOS's system colors), used only to encode real state (on-target, watch, deficit/surplus), never decoratively.
- Everything reads as native-app chrome: system font stack, bottom sheets, segmented controls, spring physics — this is a website that refuses to look like one.
- Dense, glanceable typography: tiny bold uppercase labels over large bold numbers, almost no body prose.

## Colors

The palette is intentionally small and almost entirely functional: a near-black base and two tonal steps of "panel," plus a handful of accent colors tuned in OKLCH for perceptual consistency. It started as a literal copy of iOS's dark-mode system palette; it now has its own signature hues while keeping the same semantic jobs (interactive, on-target, caution, critical). Accents are reserved for meaning, not decoration — the dosage stays rare, exactly as it was.

Every accent has two tones: a **bright** tone for text, icons, borders, and thin fills on dark surfaces, and a darker **deep** tone for solid fills that carry white text. The bright tones read clearly against the near-black base (7–10:1) but don't clear 4.5:1 with white text on top of them — no bright accent on a dark UI does, including the original iOS colors this replaced. The deep tones exist specifically to fix that: white on a deep fill clears 4.5:1+, and the deep fill itself still reads at ≥3:1 against both the canvas and the panel background.

### Primary
- **Monitor Blue** (`#00afe7`, deep fill `#067396`): The one interactive/focus color — active tab state, links, input focus ring, and the default progress-bar fill (calorie ring, macro bars, micronutrient bars) when a value isn't good/bad, just "how full." Solid buttons and the selected sex-toggle pill use the **deep** tone with white text; everywhere else uses the bright tone.

### Secondary
- **Vital Green** (`#33d977`, deep fill `#227c45`): Positive state only — in a deficit, HRV stable, RHR normal, sleep score ≥ 75, a micronutrient at/above target. Never used decoratively.
- **Alert Amber** (`#f98f3a`, deep fill `#a25e2b`): Caution state — in a surplus, a "Watch" nutrient flag, an elevated reading. This is the system's "look here" color.

### Tertiary
- **Critical Red** (`#ed5350`, deep fill `#b24743`): Hard-low/critical state — the reddest step of the micronutrient-adequacy scale (`microBarColor`) and the "Ride" activity-type color. Available for a future out-of-range-danger or data-missing state using the same role.
- **Reserved Purple** (`#b28fef`): The "Implied (undamped)" baseline reference line on the trends chart and the "Walk" activity-type color — a distinct fifth hue for reference/comparison lines and categorical labels that aren't judged good or bad.

### Data
Chart-only colors for time-series and categorical data that aren't judgments (see the Signal Color Rule below — these exist *because* judgment colors shouldn't be reused here):
- **Data Cyan** (`#41b2b2`): Weight and calorie trend lines, and the "Run" activity-type color.
- **Data Indigo** (`#4b74d8`): The sleep-duration bar chart and the HRV↔RHR scatter plot's HRV axis point color.

### Neutral
- **Night Base** (`#000000`): App background. The darkest surface in the system.
- **Panel Fill** (`#1d1d1d`): Card/tile background (`.glass-card`). One deliberate step lighter than Night Base — the first depth cue at rest.
- **Panel Fill (Elevated)** (`#262626`): Bottom-sheet/modal panel background (`ExpandModal`, `ProfileModal`, `ExplainerSheet`) — one step lighter again, so sheets read as sitting *above* cards, not just differently. All three bottom-sheet components now share this one token.
- **Panel Border** (`rgba(255, 255, 255, 0.08)`): The hairline that separates every panel from the background. Almost never visible as a distinct line — read as "the panel has an edge," not as a graphic border. One value used everywhere this role appears (previously drifted between 0.06 and 0.1).
- White at reduced opacity (`white/5` through `white/50`) carries all secondary text, dividers, and inactive states — there is no separate gray scale.

### Named Rules
**The Signal Color Rule.** Blue, green, and amber only ever appear because a value is being judged (good, watch, neutral-interactive). If a color wouldn't change based on the user's data, it isn't one of these three — it's white-at-opacity, or one of the Data colors for a non-judged series.

**The One Panel Tone Rule.** There is exactly one canvas tone and two panel tones: Night Base, Panel Fill, Panel Fill (Elevated) — each with one job (background / card / sheet). Don't introduce a fourth dark neutral; if a surface needs to look different, it should reuse one of these three, not fork a new near-duplicate.

**The Bright/Deep Rule.** An accent color used as text, an icon, a border, or a thin fill uses the bright tone. An accent color used as a solid fill with text on top of it uses the deep tone. Never put white text directly on a bright accent fill — verify with contrast math, not by eye.

## Typography

**Body/Display/Label Font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (system font stack; no webfont is loaded).
**Label/Mono Font:** system monospace, used only for the invite-code field.

**Character:** One typeface for everything, leaned on entirely through weight, size, and case rather than pairing — bold and heavy at the top of the hierarchy, tiny and uppercase at the bottom. There is no light or regular-weight display type anywhere; even body copy defaults to medium/semibold.

### Hierarchy
- **Display** (800, 2.25rem/36px, tight tracking `-0.02em`): The single hero number per card — calories vs. TDEE on Overview. Appears at most once per screen.
- **Headline** (700, 1.5rem/24px): Expanded-detail big stat (e.g. a micronutrient's daily average inside its modal), sign-in page title.
- **Title** (700, 1.125rem/18px): Modal/sheet titles, tile primary values (e.g. HRV reading, macro grams).
- **Body** (500–600, 0.875rem/14px): List rows (`ExpandListRow`), form labels' paired values, secondary sentences. Rarely runs more than one line.
- **Label** (700, 0.625rem/10px, uppercase, tracking `0.15em`): The `.card-eyebrow` treatment — every card and section header. Also used at 11px for stat captions and metadata, slightly looser tracking.

### Named Rules
**The Eyebrow-Over-Everything Rule.** Every card and every tile leads with a tiny bold uppercase label at ~40–60% opacity, then the real value in full-strength white directly below it. No card introduces its content with a sentence.

**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on `body`, so every digit in the app occupies the same width. This is an instrument panel: values change on every range switch, and the hero readout counts up continuously — proportional digits make a number visibly shuffle sideways while it settles. Don't override it back to proportional figures anywhere a number is data.

## Layout

Single-column, mobile-first, and deliberately not a page: the app shell (header, time-range selector, card dots) is fixed, and exactly one full-height "card" is visible at a time inside a horizontally swipeable/draggable container (`.swipe-container` / `.swipe-card`, CSS scroll-snap). The page itself never scrolls — only the active card's own content does.

Internal card layout is a simple `grid-cols-2 gap-3` tile grid for stat groups, with full-width sections (heatmap, charts) breaking out to a single column. Card padding is consistently `p-5` (20px) at the section level and `p-4` (16px) at the tile level. Spacing rhythm is tight and consistent: `gap-3` (12px) between tiles, `mb-6`/`mb-8` (24px/32px) between major groups inside a card.

Bottom sheets/modals (`ExpandModal`, `ProfileModal`, `ExplainerSheet`) reuse the same shell: full-width, anchored to the bottom on narrow viewports, becoming a centered `max-w-[560px]` dialog at `sm:` and above, with `env(safe-area-inset-bottom)` padding respected throughout for iOS home-indicator clearance.

## Platform Behavior

The app loads at `initial-scale=0.9` (`index.html`'s viewport meta), not 1 — everything renders about 10% smaller/denser by default, closer to a manual pinch-out than the browser default. This is `initial-scale`, not a CSS `zoom` transform on an element, specifically because `visualViewport` — which `useVisualViewportHeight`/`useBodyViewportHeight` already read to keep the app shell's height correct — tracks the browser's real pinch-zoom scale, not an arbitrary element's own `zoom`. Using the mechanism the layout code already depends on means the 90% scale needs no separate compensation for height/layout math; it falls out of the existing `visualViewport`-driven sizing for free.

Text inputs are the one thing that *does* need compensating. iOS Safari's auto-zoom-on-focus fires when a focused input's **rendered** font size — after any active page scale — is under 16px, not the raw declared CSS value. At 0.9 scale, a plain `16px` input renders at 14.4px and would trigger it. `input, select, textarea { font-size: calc(16px / var(--pwa-initial-scale)) }` in `styles.css` declares them large enough that, once the 0.9 scale is applied, they land back at exactly 16px rendered. `--pwa-initial-scale` mirrors the meta tag's value by hand — CSS can't read an HTML attribute back, so **the two must be changed together**; there's a comment at each pointing at the other.

That input rule is unlayered plain CSS, so it wins over any Tailwind text-size utility regardless of specificity or source order — a future input that sets no size at all still lands at the compensated 16px-rendered floor instead of the browser default. A future input that genuinely wants to be larger needs its own unlayered override, the pattern `.login-field` and `.tile:hover` already use elsewhere for the same reason.

## Elevation & Depth

`.glass-card` now delivers on its name: a translucent fill (`color-mix` at ~82% opacity over transparent) plus `backdrop-filter: blur(20px) saturate(150%)`, so panels read as genuinely layered over the canvas rather than just a lighter flat fill. A 1px inset top highlight (`rgba(255,255,255,0.05)`) stands in for a light source catching the glass's top edge — this is the one `box-shadow` in the system, and it exists to sell the glass material itself, not as a drop-shadow-style depth cue.

Cards also lift slightly on pointer hover (`translateY(-2px)` + a brightened border, gated to `(hover: hover) and (pointer: fine)` so touch is untouched) — a card now visibly responds before the moment of tap, not just on `:active`.

### Named Rules
**The Fill-Not-Shadow Rule.** Depth comes from translucency + blur (the glass fill) and a lightness step (Night Base → Panel Fill → Panel Fill Elevated), never from a drop-shadow-style `box-shadow`. The one `box-shadow` in the system is the inset top highlight that sells the glass material — don't add another one as a generic "make this pop" fix.

## Shapes

Radius scales with a surface's size and formality, from sharp-cornered data (heatmap cells) to fully rounded status indicators:
- `2px` — heatmap/consistency-grid cells (`.hm-*` squares); barely-rounded, reads as almost-square data.
- `10px` — form controls and segmented-control pills (inputs, selects, the sex toggle, the drag-following tab indicator).
- `12px` (`rounded-xl`) — buttons and the "Watch" callout box.
- `14px` — the default card/tile radius (`.glass-card`).
- `20px` — bottom-sheet/modal panel corners (top corners only on the mobile bottom-sheet variant).
- `9999px` (full) — progress-bar tracks and fills, the swipe-dot indicator, pill-shaped badges ("Last ~12 weeks").

No borders on cards' outer silhouette beyond the standard hairline; no clipping or masking beyond `overflow-hidden` on progress bars.

## Components

### Buttons
- **Shape:** `12px` radius (`rounded-xl`), min-height 44–48px (touch-target driven, not visual).
- **Primary:** Monitor Blue **deep** fill, white bold text, no border. Used for the single primary action per screen (Save profile, sign in) — the deep tone, not the bright one, is what keeps white text at AA contrast.
- **Ghost/Secondary:** `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.1)` hairline border, `white/70` text going to full white on `:active`. Used for reversible/secondary actions (sign out).
- **Text-only:** No fill or border, Monitor Blue (bright) text, semibold. Used for tertiary navigation ("Don't have an account? Sign up").
- **Segmented toggle (e.g. Male/Female):** Same 10px-radius family as form controls, not the button radius — selected state is a solid Monitor Blue **deep** fill with white text; unselected is the ghost-input treatment (`white/[0.04]` fill, `white/[0.06]` border).

### Cards / Containers (`.glass-card`)
- **Corner Style:** 14px radius.
- **Background:** Translucent Panel Fill (`color-mix(in oklab, #1d1d1d 82%, transparent)`) + `backdrop-filter: blur(20px) saturate(150%)` — see Elevation & Depth.
- **Shadow Strategy:** One inset top highlight only (`inset 0 1px 0 rgba(255,255,255,0.05)`), selling the glass edge — no drop shadows.
- **Border:** 1px, `rgba(255,255,255,0.08)`.
- **Internal Padding:** 20px (section-level `.glass-card`), 16px (tile-level `.glass-card`).
- **Press feedback (`.tile`):** scales to 97% on `:active` over 0.15s; disabled entirely under `prefers-reduced-motion`. Every tap-to-expand card carries this — a chart panel or a vitals tile that opens a modal is exactly as tappable as a macro tile, so it gets exactly the same feedback.
- **Hover feedback (`.tile`, pointer only):** lifts `translateY(-2px)` and brightens its border on `(hover: hover) and (pointer: fine)`, so a mouse user gets a response before the click, not just on `:active`. Never fires on touch, and combines with `:active` (not replaced by it) so a mouse click still shows the same 97% press-scale.

### Inputs / Fields
- **Style:** `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.08)` hairline border, 10px radius, 44px min-height.
- **Focus:** Border shifts to Monitor Blue (bright), plus the system-wide focus ring below.
- **Labels:** 10–11px bold uppercase, `tracking-widest`, 50–60% opacity, always above the field, never inline/floating.
- **Checkbox:** Native checkbox, `accent-neon-blue` (Monitor Blue, bright), 20×20px, always paired with a stacked label + one-line explanation.

### Modals / Bottom Sheets (`ExpandModal`, `ProfileModal`, `ExplainerSheet`)
- **Style:** Panel Fill (Elevated) (`#262626`) background, 1px `rgba(255,255,255,0.08)` border, 20px radius (top corners only when docked to the bottom edge on mobile). All three sheet components share this one background token.
- **Entrance/exit:** Spring physics (`stiffness 380, damping 34`), sliding up from `y: 100%`.
- **Dismissal:** Drag-down past ~90px or a fast downward flick closes it; the backdrop (`black/72`) is also tap-to-close. A clear horizontal swipe on the wrapper closes it too, so an in-progress card-swipe underneath isn't blocked.
- **Header:** Bold title (Title scale) + a 44×44px tap target close button (`×`), so the close target is generous even though the glyph is small.
- **Mount point:** `ExpandModal` renders through a `createPortal` to `document.body`, not in place. Every caller opens it from inside a card's own `.glass-card` section, and `.glass-card` carries `backdrop-filter` — which creates a new CSS containing block for any `position: fixed` descendant. Without the portal, the panel's "fixed" resolves against that scrolling card instead of the true viewport: it opens mid-page and drifts as the card scrolls instead of staying pinned to the screen. This was shipped, found, and fixed as a real regression from adding `backdrop-filter` to `.glass-card` — if a future surface adds `backdrop-filter`, `filter`, or `transform` to anything that could end up an ancestor of a `position: fixed` element, check for this same failure mode. `ProfileModal`/`ExplainerSheet` don't need the portal because they're mounted as siblings of the cards, never inside one — keep it that way, or give them the same treatment if that ever changes.

### Login Scene (`AnimatedLoginScene`)
The one place in the app that isn't an instrument panel. The sign-in screen sits on a full-bleed seasonal countryside painting (`public/login-scene/backgrounds/*.webp`, one of spring/summer/autumn/winter, selected by `ACTIVE_SEASON`) instead of the black canvas. This is a deliberate exception, not a drift in the system: it's the pre-auth screen, it holds no data, and nothing behind it is being judged — so the Signal Color Rule and the instrument-panel restraint have nothing to govern here.

Layers are stacked on fixed z-tiers (10 login content / 8 readability veil / 6 ambience / 4 reserved for characters / 1 background plate). Every decorative layer is `aria-hidden` and `pointer-events-none` — the form is the only thing in the tree that can receive a tap or be reached by a screen reader.

The scene cycles through the four seasons on a 19-second hold and a 2.6-second crossfade. The next painting is fetched *during* the hold rather than up front, so first paint still costs exactly one image (~300KB) and a sign-in that finishes inside twenty seconds never downloads a second one. The veil's strength transitions on the same clock, because winter needs far more shade than autumn and stepping between those values would flash.

Motion is **particles and light, not scenery**. Each season has its own drifting field — petals, upward-floating pollen, tumbling leaves, snow — built from CSS rather than image files, because at six to fourteen pixels over a painting these are abstract shapes and drawing detail into them only makes noise. Each particle is two nested elements, an outer one falling and an inner one swaying on a period that doesn't divide the first, so a dozen of them read as scattered drift rather than a dozen things on a loop. A single very large, very soft dark mass crosses the whole scene on a 74-second cycle: it reads as a cloud passing over the valley, and it is the main thing making a flat painted plate feel like it's under a live sky.

What the scene deliberately does *not* do is move the scenery. The trees and flowers are painted into one flat image and can't sway without the art being re-exported as separate layers; faking it with a scale or a pan would break the fixed camera the whole composition depends on. Under `prefers-reduced-motion` the particle field is removed outright rather than frozen — a dozen lozenges parked mid-air reads as a bug, where a still painting reads as a still painting — the cycle never starts, and only the initial season is ever fetched.

Readability is a **localized pool of shade**, not a scrim: a radial gradient centred on the card, fading out before the frame edges so the artwork survives in the corners, plus a vertical gradient anchoring the status bar and home indicator. Its peak alpha is tuned per season (`VEIL_STRENGTH`) because the source paintings differ by a lot in brightness — winter is near-white edge to edge, autumn is already dim.

The card itself uses `.login-card` / `.login-field` rather than the plain `.glass-card` treatment. Over artwork instead of black, the standard 82%-opaque fill lets a bright sky lift the whole surface, and the standard `white/[0.04]` input wash — which is *lighter* than its card — stops reading as a field at all. The login variant is more opaque, and inverts its inputs to sit **darker** than the card so a field reads as a well on any season.

### Named Rules
**The Scene-Is-Not-Chrome Rule.** The login scene's artwork, veil and ambience are decoration on a screen with no data on it. Nothing from it — background imagery, ambient motion, the seasonal palette — travels into the signed-in app, which stays the flat, near-black instrument panel described everywhere else in this document.

**The Fixed-Camera Rule.** Ambient motion moves *through* the scene or changes the light on it. The frame itself never scales, pans, or parallaxes. If something painted into the plate needs to move, that's an art request for layered exports, not a transform on the background.

### Header Identity (title, subtitle, avatar)
The app-shell header's title, subtitle, and the small circular button that opens `ProfileModal` are all editable — set from `Profile.title` / `Profile.subtitle` / `Profile.avatar_data_url`, edited via three new controls at the top of `ProfileModal` (an avatar picker plus two plain text fields), and falling back to "Health Dashboard" / "Nutrition, training & recovery" / the default person-outline icon when unset. These replaced a single `Profile.name` field that only ever fed one derived string (`"${name}'s Health Dashboard"`) — direct fields let the header say anything, not just a possessive of a name. A profile saved under the old shape is migrated on next read: `name` becomes a starting `title`, same as the other legacy `Profile` fields this app already absorbs silently rather than erroring on.

The avatar is never a raw upload. `src/lib/avatar.ts` decodes the picked file via `createImageBitmap`, center-crops it to a square, and re-encodes it at 128×128 WebP before it's ever assigned to state or persisted — a few tens of KB regardless of source photo size, which matters because the profile shares its `localStorage` quota with the persisted query cache (`main.tsx`). A decode failure (corrupt file, unsupported format) is caught and surfaced as an inline error rather than thrown, and the picker keeps whatever avatar was already set.

### Explain Chip (signature component)
A small circular "i" affordance (`white/45`, `white/90` on hover) that sits inline after any label to open a bottom-sheet definition (`ExplainerSheet`). Its hit target (13px padding, negative-margined) is deliberately larger than its visible 15px glyph — a recurring pattern here: visible size stays minimal, tap targets stay ≥44px regardless.

### Navigation (card dots + range selector)
- **Card dots:** 6px resting dot growing to a 20px pill on selection, Monitor Blue fill, 0.25s transition; each dot's real hit target is a 32px square.
- **Range selector:** A `.glass-card`-housed segmented control with a `white/10`, 10px-radius pill that spring-follows the active/dragged tab (`stiffness 500, damping 40`). Both this and the card dots share one drag interaction model: tap jumps directly, a horizontal drag previews and commits on release.

### Charts (Chart.js line fills)
Every line chart's fill (`weight`, `micronutrient history`, `HRV`, `baseline calibration`) uses a vertical `CanvasGradient` (`src/lib/chartGradient.ts`) fading from a tinted color at the plot's top edge to fully transparent at its bottom, instead of a flat low-opacity color. Bars and doughnuts stay flat — the gradient treatment is specific to line/area fills, where a flat tint reads as a paint-bucket fill rather than data.

### Entrance Motion (tile grids, chart panels, row lists)
Every grid of tiles, sequence of chart panels, and row list (macro/vital tiles, micronutrient grid, activity/lab/supplement lists, trend chart panels) fades and rises in as one staggered group on first mount (`src/lib/motionVariants.ts`: `staggerContainer`/`staggerItem`, ~35ms per item), instead of popping in fully static. The consistency heatmap fades in as a single block (`revealBlock`) rather than staggering its ~80+ individual cells. `MotionConfig reducedMotion="user"` (set once in `main.tsx`) strips the transform/translate half of this automatically under the OS reduced-motion setting, leaving only a same-timed opacity fade.

### Focus
One system-wide ring, set once on `:focus-visible` in `styles.css`: a 2px Monitor Blue (bright) outline at 2px offset. Browsers trace the element's own `border-radius`, so it fits cards, pills, and dots without per-component work. `:focus-visible` rather than `:focus` keeps it off pointer taps and shows it for keyboard users, which matters here because every tap-to-expand card is a `role="button"` with `tabIndex={0}`.

### Named Rules
**The One Focal Moment Rule.** `useAnimatedNumber`'s tick-to-value treatment (see Overview) stays on the Overview hero readout only. Don't extend it to macro grams, micronutrient tiles, or vitals — those change just as often, and a count-up on all of them stops reading as authored and starts reading as a tic. This is separate from the grid/list stagger reveal above: that's one grouped mount-time event that never repeats, not a per-value tic, so it doesn't fall under this rule.

**The Never-Suppress-Focus Rule.** Nothing sets `outline: none` / Tailwind's `outline-none`. A control that wants a custom focus treatment adds to the ring; it does not replace it with a border-colour change alone, which is what the sign-in inputs used to do.

## Do's and Don'ts

### Do:
- **Do** reserve Monitor Blue / Vital Green / Alert Amber strictly for judged states (interactive, on-target, watch) — per the Signal Color Rule.
- **Do** use the deep tone, never the bright tone, any time an accent is a solid fill with text on top — per the Bright/Deep Rule.
- **Do** keep every tap target ≥44px even when the visible element (chip, dot, close glyph) is much smaller, via padding or negative margins.
- **Do** give every interactive surface *some* physical feedback — a press-scale, a spring-follow, a drag-to-dismiss — never a flat, static state change.
- **Do** lead every card and tile with a `.card-eyebrow`-style label before the value.
- **Do** keep the system font stack; it's part of why this reads as native rather than web.

### Don't:
- **Don't** introduce a fourth dark neutral. There are exactly three (Night Base, Panel Fill, Panel Fill Elevated), each with one job — per the One Panel Tone Rule.
- **Don't** reach for the default Tailwind palette for anything data- or state-related — every color must come from the token set above (bright, deep, or Data), or it silently breaks the Signal Color Rule.
- **Don't** add `box-shadow` as a stand-in for the planned glassmorphism — that's a different visual promise (see Elevation & Depth).
- **Don't** use soft pastels, illustration, or rounded mascot-style graphics anywhere — this is the explicit anti-reference (consumer wellness apps).
- **Don't** write inline literal colors when a token + opacity utility (e.g. `bg-alert-amber/10 border-neon-amber/20`) already expresses the same thing — it silently forks the source of truth the moment the token's value changes.
