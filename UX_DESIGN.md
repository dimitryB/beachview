# UX and Visual Design

## 1. Experience principles

1. **Conditions before decoration.** The most important current value and warning reason should be visible without scrolling.
2. **Comfort is not safety.** Use precise language and keep official warnings visually separate from preference matches.
3. **Small, explainable decisions.** Every highlight states which values qualified or failed.
4. **Designed for a glance outdoors.** Large numbers, short labels, high contrast, and generous touch targets.
5. **Local and opinionated.** The app is intentionally fixed to Sandbridge rather than acting like a generic weather product.
6. **Dark without disappearing.** Surfaces must remain distinguishable in sunlight and at low brightness.

## 2. Information architecture

```text
App shell
├── Header
│   ├── VABeachCast
│   ├── Sandbridge Beach
│   ├── Data freshness
│   └── Refresh
├── Official alert region
├── Primary navigation
│   ├── Swimming
│   ├── Fishing
│   └── Config
├── Selected view
│   ├── Current conditions
│   ├── Decision details
│   ├── Tide
│   └── 10-day outlook
└── Sources, limitations, and attribution
```

The alert region is outside the tabs so official guidance remains visible in every view.

## 3. Mobile layout

```text
┌────────────────────────────────┐
│ VABeachCast        Updated 2m  │
│ Sandbridge Beach          ↻    │
├────────────────────────────────┤
│ OFFICIAL ALERT, when present   │
├────────────────────────────────┤
│ [ Swimming ] [ Fishing ][Config]│
├────────────────────────────────┤
│ NOW                            │
│  25.6°C water      33°C air    │
│  Warm-water alert              │
├───────────────┬────────────────┤
│ Waves 0.5 m   │ Period 5.7 s   │
│ Comfortable   │ Choppy         │
├───────────────┴────────────────┤
│ Wind 17 km/h SSE · Gust 21     │
├────────────────────────────────┤
│ NEXT MATCHING WINDOW           │
│ 5–7 PM · lower sun · 0.5 m     │
├────────────────────────────────┤
│ TIDE · Incoming                │
│       ~~~~~●~~~~               │
│ Low 3:39 PM    High 10:03 PM   │
│ estimated between predictions  │
├────────────────────────────────┤
│ 10-DAY OUTLOOK                 │
│ [Thu] [Fri] [Sat] [Sun] →      │
├────────────────────────────────┤
│ Sources · Limitations · Safety │
└────────────────────────────────┘
```

The values above illustrate layout only and must not be committed as live fixtures without a visible fixture label.

## 4. Desktop layout

Use a centered `12`-column grid with a maximum content width around `1200 px`.

```text
┌───────────────────────────────────────────────────────────┐
│ Header                                      Freshness · ↻ │
│ Alert region                                             │
│ Swimming | Fishing | Config                             │
├─────────────────────────────┬─────────────────────────────┤
│ Current conditions          │ Next matching window        │
│ Metric card grid            │ Rule explanations           │
├─────────────────────────────┴─────────────────────────────┤
│ Tide curve and event table                                │
├───────────────────────────────────────────────────────────┤
│ Ten-day forecast cards                                   │
├───────────────────────────────────────────────────────────┤
│ Sources and limitations                                  │
└───────────────────────────────────────────────────────────┘
```

Do not create a dense “control room” dashboard. Desktop adds breathing room and side-by-side comparison; it should not add unrelated metrics.

## 5. Visual system

### 5.1 Color tokens

Initial palette:

| Token                    | Value     | Use                          |
| ------------------------ | --------- | ---------------------------- |
| `--color-bg`             | `#07131F` | Page background              |
| `--color-surface`        | `#0D1D2A` | Primary cards                |
| `--color-surface-raised` | `#132838` | Selected/raised content      |
| `--color-border`         | `#274152` | Borders and graph grid       |
| `--color-text`           | `#F2F7FA` | Primary text                 |
| `--color-text-muted`     | `#A6BAC6` | Secondary text               |
| `--color-accent`         | `#49C6D5` | Navigation, links, tide line |
| `--color-positive`       | `#4DD592` | Preference match             |
| `--color-warning`        | `#F2B85B` | Cold, warm, sand, exposure   |
| `--color-danger`         | `#FF6878` | Red conditions and hazards   |
| `--color-cold`           | `#63A8FF` | Cold-water distinction       |

All final foreground/background pairs must pass automated and manual WCAG AA contrast checks. The palette is a starting point, not proof of compliance.

Phase 3 token verification found `17.34:1` for primary text on the page background, `7.53:1` for muted text on raised surfaces, and at least `5.40:1` for the semantic accent text on raised surfaces. Component-level and final manual contrast checks remain part of release testing.

Status colors always have a redundant cue:

- Danger: octagonal or alert icon plus “High waves,” “Choppy,” or official headline
- Warning: triangular icon plus explanatory label
- Match: check icon plus “Matches preferences”
- Unavailable: dashed treatment plus “Unavailable”

### 5.2 Typography

Use the operating system font stack to avoid a font request and improve initial rendering:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Inter is used only when locally available; do not download it for the MVP.

Recommended scale:

| Role                  | Size        | Weight                    |
| --------------------- | ----------- | ------------------------- |
| Primary current value | `2.25–3rem` | `700`                     |
| Page/view heading     | `1.5–2rem`  | `700`                     |
| Card value            | `1.5rem`    | `650`                     |
| Card heading          | `0.875rem`  | `650`, uppercase optional |
| Body                  | `1rem`      | `400`                     |
| Metadata              | `0.8125rem` | `400`                     |

Use tabular numerals for measurements and times.

### 5.3 Spacing and shape

- Base spacing unit: `4 px`
- Common gaps: `8`, `12`, `16`, `24`, and `32 px`
- Card padding: `16 px` mobile, `20–24 px` desktop
- Card radius: `14 px`
- Pill radius: `999 px`
- Border: `1 px`
- Touch targets: minimum `44 × 44 px`

Avoid heavy shadows. Borders and subtle surface changes work better in a dark interface.

## 6. Core components

### 6.1 App header

Contains:

- Product name
- `Sandbridge Beach · Virginia Beach`
- Freshness summary
- Manual refresh action

The refresh action spins only when motion is allowed. It must have a text alternative and disabled/busy state.

### 6.2 Alert banner

Official alerts use the highest visual priority and include:

- Source badge
- Exact official headline
- Severity when provided
- Expiration
- Link to the complete official notice

Derived comfort warnings must not imitate official alert styling.

### 6.3 Tab navigation

- Swimming is first and default.
- Selected state has text, background, and indicator differences.
- Tabs remain visible near the top but need not remain sticky if they obscure content.
- Keyboard behavior follows the chosen semantic pattern.

### 6.4 Metric card

Each metric card includes:

- Short metric name
- Primary value and unit
- Semantic status
- One-line explanation
- Valid time or source in expanded details

Example:

```text
WAVE PERIOD
5.7 s
⚠ Choppy · below 7 s with waves above 0.4 m
```

### 6.5 Matching-window card

Display:

- Start/end time in Sandbridge local time
- Water temperature
- Maximum wave height within the window
- Maximum wind speed within the window
- Exposure reason, such as lower UV or overcast
- Any non-blocking warning that remains

Do not show a match when required data is incomplete.

### 6.6 Tide chart

Visual anatomy:

- Horizontal time axis in Sandbridge time
- Vertical height axis in meters relative to MLLW
- Smooth estimated line
- Filled area with low-opacity accent
- Labeled official high/low markers
- Distinct current-time tracking point and vertical rule
- “Now” label that repositions to avoid clipping

Accessibility:

- Chart has an informative accessible name.
- A text summary states phase, estimated current height, next event, and time to event.
- An event table follows the graphic.
- High/low markers use shape and text, not color alone.
- Decorative SVG paths are hidden from screen readers.

### 6.7 Forecast card

Each day card contains:

- Local day and date
- Matching block or “No complete match”
- Water temperature
- Wave height
- Wind speed/direction
- Compact reason chips

On mobile, the forecast can be a horizontally scrollable snap region. It must:

- Have a visible continuation cue
- Be keyboard scrollable
- Avoid trapping vertical page gestures
- Include a nonvisual list structure

### 6.8 Fishing timeline

Each daily section orders events chronologically:

```text
07:12  Low 0.08 m
10:10  Stronger outgoing/incoming movement candidate
13:06  High 0.92 m
16:00  Wind shifts SW → E
```

Candidate cards expose their reasoning rather than showing a mysterious fish score.

### 6.9 Sources, models, and limitations

The source panel follows the selected view and precedes the footer. Its
collapsed summaries always identify:

- Open-Meteo Weather as a modeled forecast
- Open-Meteo Marine as a modeled offshore grid
- NOAA CO-OPS values as predicted high/low tides

Expanded details show the requested and returned Open-Meteo grid coordinates,
the NOAA Sandbridge station and MLLW datum, provider links, attribution, and the
distinction between predictions and VABeachCast estimates. Native `details` and
`summary` elements preserve keyboard and screen-reader behavior without custom
disclosure scripting.

### 6.10 Recommendation configuration

The Config view groups numeric controls into water/waves, wind, sun/time, and
lower-exposure sections. Every control has a persistent label, metric unit,
boundary explanation, and native number validation. Save applies the complete
validated set; Restore defaults removes the local preference entry. A visible
status identifies whether defaults or user values are active and whether the
browser accepted the write.

The view states that preferences stay on the current browser/device and do not
change provider values, official guidance, or safety precedence.

## 7. Content rules

### 7.1 Modeled values

Use “modeled” in details and provenance, not in every primary label.

Example:

```text
Water 22.4°C
Open-Meteo modeled sea-surface temperature · 4:00 PM
```

### 7.2 Tide language

Preferred:

- “Incoming”
- “Estimated 0.42 m”
- “Next predicted high”
- “NOAA high/low prediction”

Avoid:

- “The tide is exactly 0.42 m”
- “Live NOAA tide”
- “Observed tide”

### 7.3 Empty and error states

Be specific:

- “Wave forecast is temporarily unavailable.”
- “Showing weather updated 48 minutes ago.”
- “Tide predictions do not cover this date.”

Avoid generic messages such as “Something went wrong” unless accompanied by useful details.

## 8. Responsive behavior

Suggested layout breakpoints:

| Width         | Behavior                                                              |
| ------------- | --------------------------------------------------------------------- |
| `<480 px`     | Single column, compact header, two-column metric pairs where readable |
| `480–767 px`  | Single column with wider metric grid                                  |
| `768–1023 px` | Two-column major cards, expanded tide chart                           |
| `>=1024 px`   | 12-column desktop composition                                         |

Use content-driven CSS grid and container queries where practical. Breakpoints are guidance, not device categories.

## 9. Loading and motion

- Skeletons match final component dimensions to prevent layout shift.
- The ten-day Swimming and Fishing presentations load behind a labeled,
  layout-stable skeleton so current conditions can render first.
- Use a gentle opacity transition for refreshed values.
- Do not animate the tide continuously.
- Update the current tracking point at a modest interval such as once per minute.
- Respect `prefers-reduced-motion: reduce`.
- Never flash warning states.

## 10. Accessibility checklist

- One `h1`; headings descend logically.
- Skip link reaches main content.
- Navigation identifies the current view.
- Focus is visible against every surface.
- All refresh/retry controls have accessible names.
- Units remain attached to values when read by a screen reader.
- Direction arrows also expose text such as “wind from south-southeast.”
- Graph information has a text/table equivalent.
- Live regions announce provider completion or failure only once.
- Horizontal forecast scrolling works with keyboard and touch.
- Zoom to `200%` does not remove content or actions.
- Dark colors and status combinations pass contrast tests.

## 11. Design review artifacts

Before the implementation is called visually complete, capture and review:

- Swimming at `390 × 844`
- Fishing at `390 × 844`
- Swimming at `768 × 1024`
- Both views at `1440 × 1000`
- Active official alert
- One failed provider with cached data
- First load with no cache
- Long NOAA event times and large/negative tide heights
- Browser zoom at `200%`
- Reduced-motion mode
