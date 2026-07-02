# Product Requirements

## 1. Product definition

VABeachCast is a location-specific web application that helps people quickly understand swimming comfort and surf-fishing conditions at Sandbridge Beach. It favors a small set of readable, actionable metrics over a general-purpose weather dashboard.

The product has two modes:

1. **Swimming**, the default view, answers: “What does the beach feel like now, and when is the best late-day comfort window?”
2. **Fishing** answers: “What is the tide doing, how are wind and pressure changing, and when will tidal movement and wind be favorable for casting?”

## 2. Goals

- Load the current primary conditions quickly on mobile and desktop.
- Make marine conditions understandable without requiring users to interpret raw forecast data.
- Show ten days of useful trend information without overwhelming the interface.
- Use only metric units.
- Remain usable when one data provider is unavailable.
- Operate without a paid backend for normal personal/noncommercial traffic.
- Clearly distinguish modeled, predicted, derived, and official advisory information.

## 3. Non-goals

- Navigation, boating, or nautical decision support
- A declaration that ocean swimming is safe
- Emergency alerting or guaranteed delivery of warnings
- Species-specific fishing predictions in the initial release
- User accounts, social features, payments, or saved cloud profiles
- Locations outside Virginia Beach
- Historical analytics beyond what is needed to calculate a short pressure tendency

## 4. Users and core scenarios

### 4.1 Swimmer or beach visitor

The user checks the app before leaving for Sandbridge and wants to know:

- Current air and water temperature
- Whether waves are high or choppy
- Whether wind is likely to make the beach unpleasant
- Whether direct sun exposure is high
- Today’s high and low tide times
- Whether a late-afternoon or evening period matches their comfort preferences

### 4.2 Surf angler

The user wants to know:

- Whether the tide is incoming, outgoing, or near slack
- The next high and low events
- Whether pressure is rising, steady, or falling
- Wind speed, direction, and significant upcoming shifts
- Candidate periods of stronger tidal movement with manageable wind

## 5. Global functional requirements

### G-01 Location lock

All API requests and displayed labels must target Sandbridge Beach using:

- Latitude: `36.6917`
- Longitude: `-75.9200`
- Timezone: `America/New_York`
- Tide station: NOAA `8639428`

No location picker is required.

### G-02 Navigation

- Swimming is the initial route and selected tab.
- Fishing is reachable through a persistent tab control.
- The selected tab is represented in the URL so a view can be bookmarked.
- Browser back/forward navigation preserves expected tab behavior.

### G-03 Dark theme

- The application declares `color-scheme: dark`.
- All surfaces, controls, graphs, focus states, and browser chrome are designed for a dark interface.
- No light theme is required in the initial release.

### G-04 Metric-only presentation

The UI must not display Fahrenheit, feet, miles per hour, knots, or inches.

| Quantity | Unit |
| --- | --- |
| Temperature | °C |
| Wave and tide height | m |
| Wind speed and gust | km/h |
| Wave period | s |
| Pressure | hPa |
| Direction | Cardinal label with optional degrees |

### G-05 Freshness and provenance

Every data section displays:

- The observation or model time when available
- A “last updated” time
- Whether the value is forecast/model data or an official tide prediction
- A stale indicator if cached data is shown beyond its normal refresh interval

### G-06 Partial availability

A failed provider must not blank the entire application. Each major section has independent loading, stale, error, and unavailable states.

## 6. Swimming requirements

### S-01 Current air and sea conditions

Show:

- Current modeled air temperature
- Current modeled sea-surface temperature
- Current wave height
- Current wave period
- Current wind speed, direction, and gust when available

### S-02 Condition flags

Apply the rule definitions in [Data Sources and Decision Rules](DATA_AND_RULES.md). At minimum:

- Wave height above `1.0 m` is red.
- Wave period below `7 s` is red and described as choppy.
- Water below `20°C` receives a cold warning.
- Water above `24°C` receives a warm-water alert.
- Wind receives a sand/discomfort warning at the approved configured threshold.
- Strong direct midday exposure is unfavorable.
- Overcast or lower-exposure late-afternoon/evening periods can qualify as ideal when marine conditions also pass.

Color must never be the only way a condition is communicated. Every state includes a label and icon.

### S-03 Safety precedence

Official weather or surf hazards must appear above comfort information when integrated. The product must not convert a collection of favorable values into a “safe” label.

Allowed language:

- “Matches your swim preferences”
- “More comfortable”
- “Choppy”
- “High waves”
- “Strong sun exposure”

Disallowed language:

- “Safe to swim”
- “No rip-current risk”
- “Guaranteed good conditions”

### S-04 Tide visualizer

Show:

- A smooth daily tide curve
- Official predicted high/low points
- The exact predicted time and height of each event
- A tracking point at the current time
- Incoming, outgoing, or near-slack phase
- An explicit “estimated between NOAA high/low predictions” label

The chart must remain understandable without color and expose a text/table alternative to assistive technology.

### S-05 Extended swim forecast

Show up to ten local calendar days. Each day includes only:

- Sea-surface temperature
- Wave height
- Wind speed

The interface highlights qualifying late-afternoon/evening blocks. The highlight represents comfort-rule matches, not a safety decision.

Hourly data must be used to find candidate blocks; a daily average must not hide a favorable or unfavorable late-day period.

## 7. Fishing requirements

### F-01 Current fishing dashboard

Prioritize:

- Current predicted tide phase
- Previous and next tide events
- Wind speed, gust, and direction
- Sea-level pressure
- Three-hour pressure tendency

### F-02 Tide phase

Display one of:

- Incoming
- Outgoing
- Near high slack
- Near low slack
- Unavailable

The phase is derived from NOAA predictions and must be described as predicted.

### F-03 Pressure tendency

Show rising, steady, or falling based on the current modeled pressure relative to three hours earlier. Show the numeric change in hPa.

### F-04 Extended fishing outlook

For up to ten days, show:

- Major predicted high and low tide events
- Tide range
- Periods of stronger estimated tidal movement
- Wind speed/direction during candidate periods
- Material wind-direction shifts
- Pressure tendency where hourly coverage is available

Use “candidate” or “favorable” rather than “optimal” unless future versions add species- and method-specific preferences.

## 8. Non-functional requirements

### N-01 Performance

- Render the application shell immediately.
- Start all independent feed requests in parallel.
- Target primary current-condition rendering within two seconds on a typical broadband or modern mobile connection.
- Display cached data immediately when available, then refresh in the background.
- Keep initial JavaScript below the budget defined in [Technical Architecture](TECHNICAL_ARCHITECTURE.md).

The two-second target is a product objective, not a third-party service-level guarantee.

### N-02 Responsive behavior

- Fully usable from `320 px` wide mobile screens through desktop layouts.
- No horizontal page scrolling at supported widths.
- Touch targets are at least `44 × 44 px`.
- Forecast content uses horizontal scrolling only inside an explicitly labeled forecast region when necessary.

### N-03 Accessibility

- Target WCAG 2.2 AA.
- Keyboard-accessible tabs and controls
- Visible focus states
- Semantic headings and landmarks
- Text alternatives for graphs and icons
- Reduced-motion support
- Status changes announced without excessive screen-reader noise

### N-04 Reliability

- Timeouts and partial errors are handled.
- Invalid or absent values render as unavailable, never as zero.
- Cached data includes a schema version and timestamp.
- API contract changes are detected by automated fixture/contract tests.

### N-05 Cost

The initial application contains no backend, database, or paid service. Free usage is conditional on provider and host policies, traffic, and whether the project remains noncommercial.

Open-Meteo currently requires attribution and limits its free noncommercial API tier. Deployment documentation must not describe zero cost as permanently guaranteed.

## 9. MVP boundary

### Included

- Responsive dark shell and two tabs
- Open-Meteo weather and marine data
- NOAA Sandbridge tide predictions
- Derived comfort and fishing signals
- Tide chart and ten-day views
- Browser cache, stale states, source attribution, and manual refresh
- Prominent official safety links

### Follow-up candidates

- Structured NWS active-alert integration
- Robust parsing of the NWS Wakefield Surf Zone Forecast
- Installable PWA and offline application shell
- User-adjustable comfort thresholds stored locally
- Species- or fishing-method profiles
- Optional comparison against a nearby observation buoy

## 10. Acceptance summary

The MVP is acceptable when:

1. It always opens on Swimming and can deep-link to Fishing.
2. Every visible measurement is metric.
3. Current weather, marine conditions, and tide events can load independently.
4. Exact NOAA high/low predictions are distinct from the estimated curve.
5. All specified red and warning rules have unit tests at their boundaries.
6. Ten local forecast days render correctly across daylight-saving transitions.
7. The interface remains usable at `320 px`, `768 px`, and `1440 px`.
8. Keyboard and screen-reader users can obtain the same condition information as sighted users.
9. Cached/stale data is never presented as current.
10. The product never labels modeled comfort conditions as proof that swimming is safe.
