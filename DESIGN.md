---
name: Health Dashboard
description: A dark, glanceable instrument panel for daily nutrition, activity, sleep, and lab vitals.
colors:
  night-base: "#0e0e10"
  panel-fill: "#1c1c1e"
  panel-fill-elevated: "#141416"
  panel-border: "rgba(255, 255, 255, 0.06)"
  monitor-blue: "#0a84ff"
  vital-green: "#30d158"
  alert-amber: "#ff9f0a"
  critical-red: "#ff453a"
  reserved-purple: "#bf5af2"
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
    backgroundColor: "{colors.monitor-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "48px"
  button-primary-disabled:
    backgroundColor: "{colors.monitor-blue}"
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

This is a dark, glanceable instrument panel for checking your own vitals, not a marketing surface or a productivity app. Every screen is built to be read once, at a glance, often in low light — the near-black base (`#0e0e10`), flat dark panels, and a small set of iOS-system accent colors exist so the eye lands on the one number or bar that changed, not on the chrome around it. The mood is **warm but disciplined**: precise and low-stimulation like a well-designed medical readout, but with room for a little personality in copy and micro-interactions (the yogurt card's "the tub never lies") rather than clinical coldness throughout.

Interaction is **tactile and immediate**. Nothing here behaves like a static webpage: tiles compress 3% on press, segmented controls and card-navigation dots are physically draggable with a spring-following pill, and sheets/modals drag-to-dismiss with real velocity. The visual restraint is deliberate, not a placeholder for "more design later" — density and speed of reading are the product.

Explicitly not this: a consumer wellness app. No soft pastels, mascot illustrations, rounded card stacks with drop shadows, or motivational-poster energy. If a screen would look at home in a step-counter app's onboarding flow, it's off-brand here.

**Key Characteristics:**
- Near-black base with flat, hairline-bordered dark panels — depth comes from fill and border, not shadow (for now — see Elevation & Depth).
- A small, meaningful accent palette borrowed intact from iOS's system colors, used only to encode real state (on-target, watch, deficit/surplus), never decoratively.
- Everything reads as native-app chrome: system font stack, bottom sheets, segmented controls, spring physics — this is a website that refuses to look like one.
- Dense, glanceable typography: tiny bold uppercase labels over large bold numbers, almost no body prose.

## Colors

The palette is intentionally small and almost entirely functional: a near-black base and one tonal step of "panel," plus five accent colors carried over verbatim from iOS's dark-mode system palette (`systemBlue`/`systemGreen`/`systemOrange`/`systemRed`/`systemPurple`). Accents are reserved for meaning, not decoration.

### Primary
- **Monitor Blue** (`#0a84ff`): The one interactive/focus color — primary buttons, active tab state, selected toggle, links, input focus ring. Also used as the default progress-bar fill (calorie ring, micronutrient bars) when the value isn't good/bad, just "how full."

### Secondary
- **Vital Green** (`#30d158`): Positive state only — in a deficit, HRV stable, RHR normal, sleep score ≥ 75. Never used decoratively.
- **Alert Amber** (`#ff9f0a`): Caution state — in a surplus, a "Watch" nutrient flag, an elevated reading. This is the system's "look here" color.

### Tertiary
- **Critical Red** (`#ff453a`): Reserved for hard-error/critical states. Defined in the token set but not yet used anywhere in the UI — treat as available headroom for a future "data missing" or out-of-range-danger state, not dead code to remove.
- **Reserved Purple** (`#bf5af2`): Also defined but currently unused. Hold for a future fifth state (e.g. a distinct "informational" or lab-flag color) rather than reusing blue for it.

### Neutral
- **Night Base** (`#0e0e10`): App background. The darkest surface in the system.
- **Panel Fill** (`#1c1c1e`): Card/tile background (`.glass-card`). One deliberate step lighter than Night Base — the only depth cue at rest.
- **Panel Fill (Elevated)** (`#141416`): Bottom-sheet/modal panel background. Sits *between* Night Base and Panel Fill, not above it — see the Named Rule below.
- **Panel Border** (`rgba(255, 255, 255, 0.06)`): The hairline that separates every panel from the background. Almost never visible as a distinct line — read as "the panel has an edge," not as a graphic border.
- White at reduced opacity (`white/5` through `white/50`) carries all secondary text, dividers, and inactive states — there is no separate gray scale.

### Named Rules
**The Signal Color Rule.** Blue, green, and amber only ever appear because a value is being judged (good, watch, neutral-interactive). If a color wouldn't change based on the user's data, it isn't one of these three — it's white-at-opacity.

**The One Panel Tone Rule (currently violated — see Do's and Don'ts).** There should be exactly one "resting panel" fill. Today there are two nearly-identical dark fills (`#1c1c1e` cards vs. `#141416` sheets) that aren't expressed as the same token — document both as real, but don't add a third.

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
- **Primary:** Monitor Blue fill, white bold text, no border. Used for the single primary action per screen (Save profile, sign in).
- **Ghost/Secondary:** `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.1)` hairline border, `white/70` text going to full white on `:active`. Used for reversible/secondary actions (sign out).
- **Text-only:** No fill or border, Monitor Blue text, semibold. Used for tertiary navigation ("Don't have an account? Sign up").
- **Segmented toggle (e.g. Male/Female):** Same 10px-radius family as form controls, not the button radius — selected state is a solid Monitor Blue fill; unselected is the ghost-input treatment (`white/[0.04]` fill, `white/[0.06]` border).

### Cards / Containers (`.glass-card`)
- **Corner Style:** 14px radius.
- **Background:** Panel Fill (`#1c1c1e`).
- **Shadow Strategy:** None at rest — see Elevation & Depth.
- **Border:** 1px, `rgba(255,255,255,0.06)`.
- **Internal Padding:** 20px (section-level `.glass-card`), 16px (tile-level `.glass-card`).
- **Press feedback (`.tile`):** scales to 97% on `:active` over 0.15s; disabled entirely under `prefers-reduced-motion`.

### Inputs / Fields
- **Style:** `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.1)` (sign-in) or `rgba(255,255,255,0.06)` (profile form) hairline border, 10px radius, 44px min-height.
- **Focus:** Border shifts to Monitor Blue; no glow/ring.
- **Labels:** 10–11px bold uppercase, `tracking-widest`, 50–60% opacity, always above the field, never inline/floating.
- **Checkbox:** Native checkbox, `accent-neon-blue` (Monitor Blue), 20×20px, always paired with a stacked label + one-line explanation.

### Modals / Bottom Sheets (`ExpandModal`, `ProfileModal`, `ExplainerSheet`)
- **Style:** `#141416` background (Panel Fill Elevated — see Named Rule under Colors), 1px `rgba(255,255,255,0.06)` border, 20px radius (top corners only when docked to the bottom edge on mobile).
- **Entrance/exit:** Spring physics (`stiffness 380, damping 34`), sliding up from `y: 100%`.
- **Dismissal:** Drag-down past ~90px or a fast downward flick closes it; the backdrop (`black/72`) is also tap-to-close. A clear horizontal swipe on the wrapper closes it too, so an in-progress card-swipe underneath isn't blocked.
- **Header:** Bold title (Title scale) + a 44×44px tap target close button (`×`), so the close target is generous even though the glyph is small.

### Explain Chip (signature component)
A small circular "i" affordance (`white/45`, `white/90` on hover) that sits inline after any label to open a bottom-sheet definition (`ExplainerSheet`). Its hit target (13px padding, negative-margined) is deliberately larger than its visible 15px glyph — a recurring pattern here: visible size stays minimal, tap targets stay ≥44px regardless.

### Navigation (card dots + range selector)
- **Card dots:** 6px resting dot growing to a 20px pill on selection, Monitor Blue fill, 0.25s transition; each dot's real hit target is a 32px square.
- **Range selector:** A `.glass-card`-housed segmented control with a `white/10`, 10px-radius pill that spring-follows the active/dragged tab (`stiffness 500, damping 40`). Both this and the card dots share one drag interaction model: tap jumps directly, a horizontal drag previews and commits on release.

## Do's and Don'ts

### Do:
- **Do** reserve Monitor Blue / Vital Green / Alert Amber strictly for judged states (interactive, on-target, watch) — per the Signal Color Rule.
- **Do** keep every tap target ≥44px even when the visible element (chip, dot, close glyph) is much smaller, via padding or negative margins.
- **Do** give every interactive surface *some* physical feedback — a press-scale, a spring-follow, a drag-to-dismiss — never a flat, static state change.
- **Do** lead every card and tile with a `.card-eyebrow`-style label before the value.
- **Do** keep the system font stack; it's part of why this reads as native rather than web.

### Don't:
- **Don't** introduce a third dark "panel" fill. There are already two (`#1c1c1e`, `#141416`) that should arguably be one token — don't compound the drift.
- **Don't** reach for the default Tailwind palette (`green-500`, `blue-400`, `orange-400/500` currently leak into the macro-bar colors) — every color must come from the `neon-*`/semantic token set above, or it silently breaks the Signal Color Rule.
- **Don't** add `box-shadow` as a stand-in for the planned glassmorphism — that's a different visual promise (see Elevation & Depth).
- **Don't** use soft pastels, illustration, or rounded mascot-style graphics anywhere — this is the explicit anti-reference (consumer wellness apps).
- **Don't** write inline literal colors (e.g. `rgba(255,159,10,0.08)` in the Watch callout) when a token + opacity utility (`bg-alert-amber/10`) already expresses the same thing — it silently forks the source of truth.
