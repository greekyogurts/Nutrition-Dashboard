---
name: Health Dashboard
description: A dark, glanceable instrument panel for daily nutrition, activity, sleep, and lab vitals.
colors:
  night-base: "#100b08"
  panel-fill: "#201b17"
  panel-fill-elevated: "#2b2521"
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

This is a dark, glanceable instrument panel for checking your own vitals, not a marketing surface or a productivity app. Every screen is built to be read once, at a glance, often in low light — the near-black base (`#100b08`), flat dark panels, and a small, bespoke accent palette exist so the eye lands on the one number or bar that changed, not on the chrome around it. The mood is **warm but disciplined**: precise and low-stimulation like a well-designed medical readout, but with room for a little personality in copy and micro-interactions (the yogurt card's "the tub never lies") rather than clinical coldness throughout. The neutrals carry a faint warm undertone (the same hue family as the caution accent) rather than a clinical cool gray — a small, deliberate way the "warm but disciplined" mood shows up even where there's no color at all.

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
- **Night Base** (`#100b08`): App background. The darkest surface in the system.
- **Panel Fill** (`#201b17`): Card/tile background (`.glass-card`). One deliberate step lighter than Night Base — the first depth cue at rest.
- **Panel Fill (Elevated)** (`#2b2521`): Bottom-sheet/modal panel background (`ExpandModal`, `ProfileModal`, `ExplainerSheet`) — one step lighter again, so sheets read as sitting *above* cards, not just differently. All three bottom-sheet components now share this one token.
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

## Layout

Single-column, mobile-first, and deliberately not a page: the app shell (header, time-range selector, card dots) is fixed, and exactly one full-height "card" is visible at a time inside a horizontally swipeable/draggable container (`.swipe-container` / `.swipe-card`, CSS scroll-snap). The page itself never scrolls — only the active card's own content does.

Internal card layout is a simple `grid-cols-2 gap-3` tile grid for stat groups, with full-width sections (heatmap, charts) breaking out to a single column. Card padding is consistently `p-5` (20px) at the section level and `p-4` (16px) at the tile level. Spacing rhythm is tight and consistent: `gap-3` (12px) between tiles, `mb-6`/`mb-8` (24px/32px) between major groups inside a card.

Bottom sheets/modals (`ExpandModal`, `ProfileModal`, `ExplainerSheet`) reuse the same shell: full-width, anchored to the bottom on narrow viewports, becoming a centered `max-w-[560px]` dialog at `sm:` and above, with `env(safe-area-inset-bottom)` padding respected throughout for iOS home-indicator clearance.

## Elevation & Depth

Currently flat by implementation, not by intent: there are no `box-shadow`s anywhere in the system. Depth is conveyed entirely through one step of fill-lightness (Night Base → Panel Fill) plus a near-invisible hairline border. This is a real gap, not a documented design choice — the `.glass-card` name promises glassmorphism (blur, translucency, layered depth) that the current CSS doesn't deliver.

**Direction:** the next elevation pass should add real `backdrop-filter: blur(...)` translucency to panel surfaces so they read as genuinely layered over the background, consistent with the "glass" name already in use throughout the codebase. Until that lands, don't invent shadow tokens to fill the gap — ship the blur, don't fake depth with shadows instead.

### Named Rules
**The Fill-Not-Shadow Rule (provisional).** Until real glassmorphism ships, depth comes from a lightness step and a hairline border, never from `box-shadow`. Don't reach for a drop shadow as a shortcut for the planned blur treatment.

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
- **Background:** Panel Fill (`#201b17`).
- **Shadow Strategy:** None at rest — see Elevation & Depth.
- **Border:** 1px, `rgba(255,255,255,0.08)`.
- **Internal Padding:** 20px (section-level `.glass-card`), 16px (tile-level `.glass-card`).
- **Press feedback (`.tile`):** scales to 97% on `:active` over 0.15s; disabled entirely under `prefers-reduced-motion`. Every tap-to-expand card carries this — a chart panel or a vitals tile that opens a modal is exactly as tappable as a macro tile, so it gets exactly the same feedback.

### Inputs / Fields
- **Style:** `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.08)` hairline border, 10px radius, 44px min-height.
- **Focus:** Border shifts to Monitor Blue (bright); no glow/ring.
- **Labels:** 10–11px bold uppercase, `tracking-widest`, 50–60% opacity, always above the field, never inline/floating.
- **Checkbox:** Native checkbox, `accent-neon-blue` (Monitor Blue, bright), 20×20px, always paired with a stacked label + one-line explanation.

### Modals / Bottom Sheets (`ExpandModal`, `ProfileModal`, `ExplainerSheet`)
- **Style:** Panel Fill (Elevated) (`#2b2521`) background, 1px `rgba(255,255,255,0.08)` border, 20px radius (top corners only when docked to the bottom edge on mobile). All three sheet components share this one background token.
- **Entrance/exit:** Spring physics (`stiffness 380, damping 34`), sliding up from `y: 100%`.
- **Dismissal:** Drag-down past ~90px or a fast downward flick closes it; the backdrop (`black/72`) is also tap-to-close. A clear horizontal swipe on the wrapper closes it too, so an in-progress card-swipe underneath isn't blocked.
- **Header:** Bold title (Title scale) + a 44×44px tap target close button (`×`), so the close target is generous even though the glyph is small.

### Explain Chip (signature component)
A small circular "i" affordance (`white/45`, `white/90` on hover) that sits inline after any label to open a bottom-sheet definition (`ExplainerSheet`). Its hit target (13px padding, negative-margined) is deliberately larger than its visible 15px glyph — a recurring pattern here: visible size stays minimal, tap targets stay ≥44px regardless.

### Navigation (card dots + range selector)
- **Card dots:** 6px resting dot growing to a 20px pill on selection, Monitor Blue fill, 0.25s transition; each dot's real hit target is a 32px square.
- **Range selector:** A `.glass-card`-housed segmented control with a `white/10`, 10px-radius pill that spring-follows the active/dragged tab (`stiffness 500, damping 40`). Both this and the card dots share one drag interaction model: tap jumps directly, a horizontal drag previews and commits on release.

### Named Rules
**The One Focal Moment Rule.** `useAnimatedNumber`'s tick-to-value treatment (see Overview) stays on the Overview hero readout only. Don't extend it to macro grams, micronutrient tiles, or vitals — those change just as often, and a count-up on all of them stops reading as authored and starts reading as a tic.

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
