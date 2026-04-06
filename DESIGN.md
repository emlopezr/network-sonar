# Design System Document: Engineering Precision



## 1. Overview & Creative North Star: "The Silent Sentinel"

The design system is built for the "Silent Sentinel." It moves away from the flashy, consumer-grade "dashboard" aesthetic and embraces the aesthetics of high-end engineering instrumentation and aerospace telemetry. The goal is to provide a UI that feels like an extension of the hardware it monitors: reliable, quiet, and profoundly precise.



**Creative North Star: The Silent Sentinel**

This system prioritizes "Information over Interface." We achieve a premium feel through **Hyper-Structured Density**. Rather than using whitespace to "breathe," we use it to categorize. We break the template look by using **Intentional Asymmetry**—maintaining a rigid technical grid on the left for status, while allowing fluid, high-density data visualization to expand on the right. Every pixel must justify its existence.



---



## 2. Colors: Functional Chromaticism

Our palette is rooted in the `surface-dim` (#111317), providing a low-fatigue environment for long-term monitoring. Color is never decorative; it is a data point.



* **Primary (`#4edea3`):** Used exclusively for active states and "System Healthy" indicators.

* **Secondary (`#b7c8e1`):** Reserved for technical metadata and inactive UI controls.

* **Functional Status:**

* `primary-container` (#10B981): Optimal Connectivity.

* `error` (#FFB4AB): Critical Failure/Down.

* `secondary-container` (#64748B): Stale/Dormant data.



**The "No-Line" Rule**

Prohibit standard 1px solid borders for sectioning. Structural boundaries are defined by background shifts. Use `surface-container-low` (#1A1C20) against the `background` (#111317) to define workspace regions.



**Surface Hierarchy & Nesting**

Treat the UI as a machined console. Use `surface-container-lowest` for the base "floor" of the application, and `surface-container-high` (#282A2E) for active diagnostic panels. This creates a "milled" effect, where interactive elements feel recessed or extruded from a single block of material.



**Signature Textures**

To avoid a "flat" web feel, apply a subtle noise texture (1-2% opacity) over `surface` layers. Main CTAs may use a micro-gradient from `primary` (#4EDE93) to `primary-container` (#10B981) to simulate the slight luminosity of a physical LED indicator.



---



## 3. Typography: The Technical Ledger

We pair the Swiss-style clarity of **Inter** with the mechanical rhythm of **JetBrains Mono**.



* **Headlines & Titles (Inter):** Set with tight letter-spacing (-0.02em) and medium weights to convey authority.

* **Data & Metrics (JetBrains Mono):** All numerical values, IP addresses, and timestamps must use the mono-spaced font. This ensures that changing numbers do not cause "layout jitter" and maintains vertical alignment in data grids.

* **Labels (Space Grotesk):** We introduce Space Grotesk for `label-md` and `label-sm` to provide a subtle "NASA-spec" editorial feel to the smallest technical captions.



---



## 4. Elevation & Depth: Tonal Layering

In an engineering tool, shadows are often distracting. We replace elevation with **Tonal Layering**.



* **The Layering Principle:** A "floating" diagnostic card should not have a shadow. Instead, it should use a `surface-bright` (#37393E) fill to physically contrast against the `surface-dim` background.

* **The "Ghost Border" Fallback:** Where separation is critical (e.g., in high-density heatmaps), use the `outline-variant` (#3C4A42) at 15% opacity. This creates a "trace line" rather than a hard border.

* **Glassmorphism & Depth:** For overlaying tooltips or "command-K" menus, use `surface-container` with a `backdrop-filter: blur(12px)`. This maintains the context of the network map underneath while providing a clear interactive surface.



---



## 5. Components



### Technical Badges

* **Construction:** `0.125rem` (sm) radius. JetBrains Mono, All-Caps, 0.05em tracking.

* **Styling:** Use `on_primary_container` text on `primary_container` backgrounds for high-contrast status hits.



### Status Cards & Diagnostic Messages

* **Construction:** No borders. Use `surface-container-low` for the body.

* **Detail:** A 2px vertical "accent strip" on the left edge using the functional color (Green, Red, or Amber) communicates status instantly without overwhelming the card.



### Horizontal Heatmap/Timeline

* **Construction:** Each "cell" represents a time slice.

* **Spacing:** 1px gap between cells using `surface_container_lowest`.

* **Interaction:** On hover, a cell should scale slightly (1.1x) and trigger a Glassmorphic tooltip.



### Buttons & Inputs

* **Buttons:** Rectangular (`4px` radius). Primary buttons use `primary` fill with `on_primary` text. No shadows.

* **Input Fields:** Ghost style. No background fill, only a bottom-border using `outline-variant`. Focus state shifts the border to `primary`.



### List & Data Grids

* **Rule:** Forbid divider lines. Separate rows using 8px of vertical whitespace or a subtle `surface_container_high` hover state.



---



## 6. Do's and Don'ts



### Do

* **Do** use JetBrains Mono for every single numerical value.

* **Do** align all elements to a strict 4px grid to maintain "engineered" precision.

* **Do** use "Ghost Borders" (low opacity) only when background shifts are insufficient.

* **Do** use truncated text with ellipses for long hardware strings to maintain layout density.



### Don't

* **Don't** use large corner radii. This is a tool, not a toy. Stay within the 4-6px range.

* **Don't** use standard "drop shadows." Use tonal shifts (`surface-container` tiers) to show hierarchy.

* **Don't** use decorative gradients or "gamified" animations. Transitions should be fast (150ms) and linear.

* **Don't** use centered text. Use left-aligned "ledger" layouts for better readability of technical logs.