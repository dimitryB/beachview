# Step-by-Step Implementation Roadmap

## 1. Delivery strategy

Implement data correctness and derived rules before visual polish. Each phase should leave the repository in a buildable, tested state.

The roadmap assumes one static web application and no backend.

## 2. Decisions required before coding

Resolve these during Phase 0:

- [ ] Approve **VABeachCast** as the working product name.
- [ ] Confirm the warm-water rule remains `>24°C`.
- [ ] Confirm that the warm state is called an alert, not a general hazard.
- [ ] Approve proposed wind thresholds: warning at `20 km/h` sustained or `30 km/h` gust.
- [ ] Approve proposed strong-wind thresholds: `35 km/h` sustained or `50 km/h` gust.
- [ ] Approve late-day candidate start at `15:00`.
- [ ] Choose whether structured NWS alerts are MVP or the first follow-up.

Thresholds must live in configuration so later changes do not require component rewrites.

## Phase 0 — Repository and product baseline

### Step 1: Initialize the application

- [ ] Create a Vite React TypeScript project in the repository root.
- [ ] Enable strict TypeScript settings.
- [ ] Add ESLint, Prettier, Vitest, Testing Library, and Playwright.
- [ ] Add scripts for `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, and `test:e2e`.
- [ ] Preserve this documentation structure.

### Step 2: Establish project conventions

- [ ] Create the source tree described in [Technical Architecture](TECHNICAL_ARCHITECTURE.md).
- [ ] Add absolute or well-defined import aliases.
- [ ] Add environment-independent location and rule configuration.
- [ ] Add a pull-request or contribution checklist if more than one developer will contribute.

### Step 3: Add continuous integration

- [ ] Run formatting, lint, type checking, unit tests, and build on every proposed change.
- [ ] Cache dependencies without caching build output incorrectly.
- [ ] Add Playwright after the first browser flow exists.

### Phase 0 exit criteria

- A clean clone installs and builds.
- The default page renders a minimal dark shell.
- CI passes.
- Product thresholds and terminology decisions are recorded.

## Phase 1 — Domain types and provider adapters

### Step 4: Add fixed Sandbridge configuration

- [ ] Define coordinates, timezone, NOAA station, datum, units, and forecast length.
- [ ] Write a test that prevents accidental location or unit changes.

### Step 5: Define normalized domain types

- [ ] Add types for timestamps, values, provenance, freshness, current conditions, hourly forecasts, tide events, and alerts.
- [ ] Represent missing values with `null`.
- [ ] Distinguish modeled, predicted, derived, and official-alert data.

### Step 6: Build the shared fetch utility

- [ ] Add timeout support with `AbortController`.
- [ ] Check response status and parse JSON safely.
- [ ] Return typed provider errors.
- [ ] Record fetch duration and timestamp.
- [ ] Add controlled retry behavior for transient failures.

### Step 7: Implement Open-Meteo Weather

- [ ] Build the fixed request URL.
- [ ] Validate current, hourly, daily, and unit fields.
- [ ] Normalize air, wind, pressure, cloud, UV, radiation, sunrise, and sunset.
- [ ] Add normal, missing-value, malformed, and provider-error fixtures.

### Step 8: Implement Open-Meteo Marine

- [ ] Build the fixed request URL with sea-cell selection and metric units.
- [ ] Normalize wave height, wave period, and sea-surface temperature.
- [ ] Preserve returned grid coordinates for source details.
- [ ] Test nulls and differing hourly coverage.

### Step 9: Implement NOAA tides

- [ ] Build buffered GMT requests for station `8639428`.
- [ ] Detect NOAA error objects even when the HTTP response succeeds.
- [ ] Parse NOAA timestamps explicitly as UTC.
- [ ] Normalize high/low events and MLLW heights.
- [ ] Convert/filter only after applying the Sandbridge timezone.
- [ ] Test high/low events around local midnight and DST changes.

### Step 10: Add browser caching

- [ ] Store each provider independently.
- [ ] Add schema version, fetch time, expiry, and provider identifier.
- [ ] Reject corrupt or incompatible entries.
- [ ] Implement fresh, refreshing, stale, error, and unavailable states.

### Phase 1 exit criteria

- Tests produce a complete normalized data model from fixtures.
- Live development requests return metric Sandbridge data.
- One provider can fail without discarding the others.
- Cached fixture data can render before a refresh completes.

## Phase 2 — Derived domain behavior

### Step 11: Implement wind utilities

- [ ] Normalize degrees.
- [ ] Convert degrees to 16-point cardinal labels.
- [ ] Calculate circular direction change.
- [ ] Detect meaningful six-hour shifts.

### Step 12: Implement pressure tendency

- [ ] Select the closest valid value about three hours earlier.
- [ ] Calculate signed hPa change.
- [ ] Classify rising, steady, and falling.
- [ ] Test equality and missing-history boundaries.

### Step 13: Implement tide phase and interpolation

- [ ] Locate bounding events.
- [ ] Classify incoming, outgoing, and near-slack states.
- [ ] Calculate estimated height with cosine interpolation.
- [ ] Calculate time until next event.
- [ ] Generate accessible event summaries.
- [ ] Ensure all derived tide values carry an estimated label.

### Step 14: Implement swimming rules

- [ ] Add wave-height, period, temperature, wind, gust, UV, and radiation rules.
- [ ] Return semantic status, label, and explanation from every rule.
- [ ] Test the exact `1.0 m`, `7 s`, `20°C`, and `24°C` boundaries.
- [ ] Implement precedence without using a “safe” aggregate.

### Step 15: Implement late-day forecast blocks

- [ ] Convert hourly records into Sandbridge local time.
- [ ] Generate consecutive two-hour candidate windows from `15:00` to sunset.
- [ ] Reject incomplete and red-condition windows.
- [ ] Apply exposure and wind criteria.
- [ ] Select the longest/earliest passing window.
- [ ] Produce an explainable view model.

### Step 16: Implement fishing signals

- [ ] Calculate daily tide ranges.
- [ ] Identify stronger estimated tidal-movement midpoints.
- [ ] Attach wind, gust, direction, and pressure to candidate windows.
- [ ] Flag material wind shifts.
- [ ] Generate chronological daily fishing timelines.

### Phase 2 exit criteria

- All rule boundaries and time calculations have unit tests.
- Ten-day inputs generate stable Swimming and Fishing view models.
- No derived output is described as observed or guaranteed.

## Phase 3 — Application shell and current conditions

### Step 17: Implement design tokens and global layout

- [ ] Add dark color, type, spacing, radius, and focus tokens.
- [ ] Declare `color-scheme: dark`.
- [ ] Add global landmarks, skip link, maximum width, and responsive grid.
- [ ] Verify base color contrast.

### Step 18: Implement navigation

- [ ] Add Swimming and Fishing links/tabs.
- [ ] Default unknown/missing view values to Swimming.
- [ ] Keep the selected view in the query string.
- [ ] Test keyboard and browser back/forward behavior.

### Step 19: Implement shared loading and error components

- [ ] Add layout-stable skeletons.
- [ ] Add stale, offline, retry, and unavailable messages.
- [ ] Add freshness badges and source details.
- [ ] Avoid a page-level all-or-nothing spinner.

### Step 20: Implement Swimming current conditions

- [ ] Add primary air/water card.
- [ ] Add wave height and period cards.
- [ ] Add wind speed/direction/gust card.
- [ ] Add status icons, labels, and explanations.
- [ ] Add current update time and provider details.

### Step 21: Implement Fishing current conditions

- [ ] Add predicted tide phase and next event.
- [ ] Add wind and gust.
- [ ] Add pressure and three-hour tendency.
- [ ] Keep marine comfort language out of the fishing layout.

### Phase 3 exit criteria

- Both tabs render from mocked and live normalized data.
- Mobile and desktop current-condition layouts work.
- Every status has a non-color cue.
- Partial failures are understandable and recoverable.

## Phase 4 — Tide and extended forecasts

### Step 22: Build the tide chart

- [ ] Define stable SVG scales and margins.
- [ ] Render the estimated curve.
- [ ] Render high/low event markers and labels.
- [ ] Render the current-time rule and tracking point.
- [ ] Handle chart edges, negative heights, and missing bounding events.
- [ ] Add phase summary and event-table alternative.
- [ ] Update the tracking point once per minute.

### Step 23: Build the Swimming outlook

- [ ] Create ten local-day cards.
- [ ] Show only water temperature, wave height, and wind speed.
- [ ] Highlight qualifying late-day blocks.
- [ ] Explain why a block qualifies.
- [ ] Provide “no complete match” and incomplete-data states.

### Step 24: Build the Fishing outlook

- [ ] Show daily high/low events and tide ranges.
- [ ] Show stronger-movement candidate periods.
- [ ] Attach wind behavior and pressure tendency.
- [ ] Highlight material wind shifts.
- [ ] Use chronological timelines on mobile and compact daily groups on desktop.

### Phase 4 exit criteria

- The tide graphic and text/table alternative communicate equivalent information.
- Ten days group correctly in Eastern time.
- Forecasts remain usable at `320 px` without page-level horizontal overflow.

## Phase 5 — Safety, provenance, and accessibility

### Step 25: Add safety source presentation

- [ ] Add a persistent link to the NWS Wakefield Surf Zone Forecast.
- [ ] Add a persistent link to the VDH swimming-advisory map.
- [ ] Add approved “conditions, not a safety determination” language.
- [ ] Ensure official source content visually outranks derived warnings.

### Step 26: Add structured NWS alerts if included in MVP

- [ ] Fetch active alerts for the fixed point.
- [ ] Validate expiration and geographic applicability.
- [ ] Render sanitized headline, severity, expiry, and source link.
- [ ] Prevent an expired cached alert from displaying.
- [ ] Test an alert in both tabs.

### Step 27: Complete provenance and attribution

- [ ] Add source/model labels.
- [ ] Add returned marine grid location in details.
- [ ] Add NOAA station and datum details.
- [ ] Add Open-Meteo, model, NOAA, and NWS attribution as applicable.

### Step 28: Complete accessibility work

- [ ] Run automated axe checks.
- [ ] Finish keyboard behavior.
- [ ] Test graph alternatives with a screen reader.
- [ ] Verify status announcements.
- [ ] Test `200%` zoom and reduced motion.
- [ ] Resolve all critical and serious accessibility findings.

### Phase 5 exit criteria

- Safety limitations and official links are visible.
- Official alert behavior, if implemented, is correct and tested.
- Both tabs meet the documented keyboard and screen-reader expectations.

## Phase 6 — Performance, resilience, and PWA option

### Step 29: Optimize loading

- [ ] Start independent requests concurrently.
- [ ] Preconnect to provider origins.
- [ ] Confirm current conditions do not wait for ten-day rendering.
- [ ] Remove or replace oversized dependencies.
- [ ] Verify production bundle budgets.

### Step 30: Harden network behavior

- [ ] Test slow, offline, timeout, malformed, and partial responses.
- [ ] Confirm stale content cannot appear fresh.
- [ ] Add manual per-section or global refresh behavior.
- [ ] Prevent rapid repeated refresh calls.

### Step 31: Add an installable PWA only if desired

- [ ] Add manifest and icons.
- [ ] Cache the application shell.
- [ ] Do not treat cached forecast data as indefinitely fresh.
- [ ] Test update behavior to avoid a stranded old application build.

PWA support is optional and must not delay a correct responsive web release.

### Phase 6 exit criteria

- Production budgets are met or exceptions are documented.
- The application degrades cleanly during provider and network failures.
- Cached data always carries accurate age/freshness language.

## Phase 7 — Release and deployment

### Step 32: Complete release testing

- [ ] Run all unit, component, and browser tests.
- [ ] Complete the time-zone test matrix.
- [ ] Capture required mobile, tablet, and desktop screenshots.
- [ ] Complete manual keyboard and screen-reader checks.
- [ ] Compare NOAA events against the official station page.

### Step 33: Configure static hosting

- [ ] Choose GitHub Pages or another eligible free personal-project host.
- [ ] Configure base path and asset URLs.
- [ ] Configure HTTPS and cache headers where supported.
- [ ] Verify direct URLs with query-string view selection.

### Step 34: Deploy

- [ ] Build from a clean locked install.
- [ ] Publish only the generated static output.
- [ ] Run post-deployment smoke checks.
- [ ] Record the release date and source/provider terms reviewed.

### Step 35: Establish maintenance

- [ ] Enable dependency update notifications.
- [ ] Schedule monthly provider contract checks.
- [ ] Review thresholds before each swimming season.
- [ ] Track provider quota or policy changes.
- [ ] Keep a short release log.

### Phase 7 exit criteria

- The production URL passes all deployment checklist items.
- Both tabs work on mobile and desktop.
- Live Sandbridge values, tide predictions, attribution, and source links are correct.
- The project has an owner and maintenance cadence.

## 3. Suggested milestone grouping

| Milestone | Phases | Demonstrable outcome |
| --- | --- | --- |
| M1: Data foundation | 0–2 | Tested Sandbridge domain model and derived rules |
| M2: Usable dashboard | 3 | Responsive live current conditions in both tabs |
| M3: Complete MVP | 4–5 | Tide chart, ten-day views, safety/provenance, accessibility |
| M4: Production release | 6–7 | Resilient, optimized, deployed static application |

## 4. Definition of done

A task is done only when:

- Implementation and types are complete.
- Boundary and failure tests are added.
- Loading, stale, unavailable, and error states are considered.
- Mobile and keyboard behavior is verified.
- User-facing source and estimation language remains accurate.
- Documentation changes with any altered behavior or threshold.
