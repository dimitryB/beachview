# Step-by-Step Implementation Roadmap

## 1. Delivery strategy

Implement data correctness and derived rules before visual polish. Each phase should leave the repository in a buildable, tested state.

The roadmap assumes one static web application and no backend.

## 2. Approved product decisions

Recorded July 2, 2026:

- [x] Use **VABeachCast** as the working product name.
- [x] Keep the warm-water rule at `>24°C`.
- [x] Call the warm state an alert, not a general hazard.
- [x] Warn at `20 km/h` sustained wind or `30 km/h` gust.
- [x] Use a red strong-wind state at `35 km/h` sustained wind or `50 km/h` gust.
- [x] Start late-day candidate evaluation at `15:00`.
- [x] Defer structured NWS alerts to the first follow-up; the MVP provides official source links.

Thresholds must live in configuration so later changes do not require component rewrites.

## Phase 0 — Repository and product baseline

**Status: Complete — July 2, 2026**

### Step 1: Initialize the application

- [x] Create a Vite React TypeScript project in the repository root.
- [x] Enable strict TypeScript settings.
- [x] Add ESLint, Prettier, Vitest, Testing Library, and Playwright.
- [x] Add scripts for `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, and `test:e2e`.
- [x] Preserve this documentation structure.

### Step 2: Establish project conventions

- [x] Create the source tree described in [Technical Architecture](TECHNICAL_ARCHITECTURE.md).
- [x] Add absolute or well-defined import aliases.
- [x] Add environment-independent location and rule configuration.
- [x] Add a contribution checklist.

### Step 3: Add continuous integration

- [x] Run formatting, lint, type checking, unit tests, and build on every proposed change.
- [x] Cache dependencies without caching build output incorrectly.
- [x] Add Playwright coverage for the first desktop and mobile browser flows.

### Phase 0 exit criteria

- [x] A locked install builds successfully.
- [x] The default page renders a minimal responsive dark shell.
- [x] The local CI-equivalent checks pass and the workflow is configured.
- [x] Product thresholds and terminology decisions are recorded.

## Phase 1 — Domain types and provider adapters

**Status: Complete — July 2, 2026**

### Step 4: Add fixed Sandbridge configuration

- [x] Define coordinates, timezone, NOAA station, datum, units, and forecast length.
- [x] Write a test that prevents accidental location or unit changes.

### Step 5: Define normalized domain types

- [x] Add types for timestamps, values, provenance, freshness, current conditions, hourly forecasts, tide events, and alerts.
- [x] Represent missing values with `null`.
- [x] Distinguish modeled, predicted, derived, and official-alert data.

### Step 6: Build the shared fetch utility

- [x] Add timeout support with `AbortController`.
- [x] Check response status and parse JSON safely.
- [x] Return typed provider errors.
- [x] Record fetch duration and timestamp.
- [x] Add controlled retry behavior for transient failures.

### Step 7: Implement Open-Meteo Weather

- [x] Build the fixed request URL.
- [x] Validate current, hourly, daily, and unit fields.
- [x] Normalize air, wind, pressure, cloud, UV, radiation, sunrise, and sunset.
- [x] Add normal, missing-value, malformed, and provider-error fixtures.

### Step 8: Implement Open-Meteo Marine

- [x] Build the fixed request URL with sea-cell selection and metric units.
- [x] Normalize wave height, wave period, and sea-surface temperature.
- [x] Preserve returned grid coordinates for source details.
- [x] Test nulls and differing hourly coverage.

### Step 9: Implement NOAA tides

- [x] Build buffered GMT requests for station `8639428`.
- [x] Detect NOAA error objects even when the HTTP response succeeds.
- [x] Parse NOAA timestamps explicitly as UTC.
- [x] Normalize high/low events and MLLW heights.
- [x] Convert/filter only after applying the Sandbridge timezone.
- [x] Test high/low events around local midnight and DST changes.

### Step 10: Add browser caching

- [x] Store each provider independently.
- [x] Add schema version, fetch time, stale time, expiry, and provider identifier.
- [x] Reject corrupt or incompatible entries.
- [x] Implement loading, fresh, refreshing, stale, and error/unavailable presentation states.

### Phase 1 exit criteria

- [x] Tests produce a complete normalized data model from fixtures.
- [x] Live development requests return metric Sandbridge data.
- [x] One provider can fail without discarding the others.
- [x] Cached fixture data can render before a refresh completes.

## Phase 2 — Derived domain behavior

**Status: Complete — July 2, 2026**

### Step 11: Implement wind utilities

- [x] Normalize degrees.
- [x] Convert degrees to 16-point cardinal labels.
- [x] Calculate circular direction change.
- [x] Detect meaningful six-hour shifts.

### Step 12: Implement pressure tendency

- [x] Select the closest valid value about three hours earlier.
- [x] Calculate signed hPa change.
- [x] Classify rising, steady, and falling.
- [x] Test equality and missing-history boundaries.

### Step 13: Implement tide phase and interpolation

- [x] Locate bounding events.
- [x] Classify incoming, outgoing, and near-slack states.
- [x] Calculate estimated height with cosine interpolation.
- [x] Calculate time until next event.
- [x] Generate accessible event summaries.
- [x] Ensure all derived tide values carry an estimated label.

### Step 14: Implement swimming rules

- [x] Add wave-height, period, temperature, wind, gust, UV, and radiation rules.
- [x] Return semantic status, label, and explanation from every rule.
- [x] Test the exact `1.0 m`, `7 s`, `20°C`, and `24°C` boundaries.
- [x] Implement precedence without using a “safe” aggregate.

### Step 15: Implement late-day forecast blocks

- [x] Convert hourly records into Sandbridge local time.
- [x] Generate consecutive two-hour candidate windows from `15:00` to sunset.
- [x] Reject incomplete and red-condition windows.
- [x] Apply exposure and wind criteria.
- [x] Select the longest/earliest passing window.
- [x] Produce an explainable view model.

### Step 16: Implement fishing signals

- [x] Calculate daily tide ranges.
- [x] Identify stronger estimated tidal-movement midpoints.
- [x] Attach wind, gust, direction, and pressure to candidate windows.
- [x] Flag material wind shifts.
- [x] Generate chronological daily fishing timelines.

### Phase 2 exit criteria

- [x] All rule boundaries and time calculations have unit tests.
- [x] Ten-day inputs generate stable Swimming and Fishing view models.
- [x] No derived output is described as observed or guaranteed.

## Phase 3 — Application shell and current conditions

**Status: Complete — July 2, 2026**

### Step 17: Implement design tokens and global layout

- [x] Add dark color, type, spacing, radius, and focus tokens.
- [x] Declare `color-scheme: dark`.
- [x] Add global landmarks, skip link, maximum width, and responsive grid.
- [x] Verify base color contrast.

### Step 18: Implement navigation

- [x] Add Swimming and Fishing links/tabs.
- [x] Default unknown/missing view values to Swimming.
- [x] Keep the selected view in the query string.
- [x] Test keyboard and browser back/forward behavior.

### Step 19: Implement shared loading and error components

- [x] Add layout-stable skeletons.
- [x] Add stale, offline, retry, and unavailable messages.
- [x] Add freshness badges and source details.
- [x] Avoid a page-level all-or-nothing spinner.

### Step 20: Implement Swimming current conditions

- [x] Add primary air/water card.
- [x] Add wave height and period cards.
- [x] Add wind speed/direction/gust card.
- [x] Add status icons, labels, and explanations.
- [x] Add current update time and provider details.

### Step 21: Implement Fishing current conditions

- [x] Add predicted tide phase and next event.
- [x] Add wind and gust.
- [x] Add pressure and three-hour tendency.
- [x] Keep marine comfort language out of the fishing layout.

### Phase 3 exit criteria

- [x] Both tabs render from mocked and live normalized data.
- [x] Mobile and desktop current-condition layouts work.
- [x] Every status has a non-color cue.
- [x] Partial failures are understandable and recoverable.

## Phase 4 — Tide and extended forecasts

**Status: Complete — July 3, 2026**

### Step 22: Build the tide chart

- [x] Define stable SVG scales and margins.
- [x] Render the estimated curve.
- [x] Render high/low event markers and labels.
- [x] Render the current-time rule and tracking point.
- [x] Handle chart edges, negative heights, and missing bounding events.
- [x] Add phase summary and event-table alternative.
- [x] Update the tracking point once per minute.

### Step 23: Build the Swimming outlook

- [x] Create ten local-day cards.
- [x] Show only water temperature, wave height, and wind speed.
- [x] Highlight qualifying late-day blocks.
- [x] Explain why a block qualifies.
- [x] Provide “no complete match” and incomplete-data states.

### Step 24: Build the Fishing outlook

- [x] Show daily high/low events and tide ranges.
- [x] Show stronger-movement candidate periods.
- [x] Attach wind behavior and pressure tendency.
- [x] Highlight material wind shifts.
- [x] Use chronological timelines on mobile and compact daily groups on desktop.

### Phase 4 exit criteria

- The tide graphic and text/table alternative communicate equivalent information.
- Ten days group correctly in Eastern time.
- Forecasts remain usable at `320 px` without page-level horizontal overflow.

## Phase 5 — Safety, provenance, and accessibility

**Status: Implemented — July 3, 2026 (manual screen-reader confirmation remains part of Phase 7 release testing)**

### Step 25: Add safety source presentation

- [x] Add a persistent link to the NWS Wakefield Surf Zone Forecast.
- [x] Add a persistent link to the VDH swimming-advisory map.
- [x] Add approved “conditions, not a safety determination” language.
- [x] Ensure official source content visually outranks derived warnings.

### Step 26: First follow-up — add structured NWS alerts

This step is explicitly deferred and does not block the MVP or the Phase 5 exit criteria.

- [ ] Fetch active alerts for the fixed point.
- [ ] Validate expiration and geographic applicability.
- [ ] Render sanitized headline, severity, expiry, and source link.
- [ ] Prevent an expired cached alert from displaying.
- [ ] Test an alert in both tabs.

### Step 27: Complete provenance and attribution

- [x] Add source/model labels.
- [x] Add returned marine grid location in details.
- [x] Add NOAA station and datum details.
- [x] Add Open-Meteo, model, NOAA, and NWS attribution as applicable.

### Step 28: Complete accessibility work

- [x] Run automated axe checks.
- [x] Finish keyboard behavior.
- [ ] Test graph alternatives with a screen reader.
- [x] Verify status announcements.
- [x] Test `320 px` reflow and reduced motion.
- [ ] Confirm `200%` browser zoom manually.
- [x] Resolve all critical and serious accessibility findings.

Automated tests verify the tide chart’s equivalent summary/table structure. A
manual screen-reader and browser-zoom pass remains required before release and
is tracked again in Phase 7.

### Phase 5 exit criteria

- Safety limitations and official links are visible.
- The MVP links to official NWS and VDH sources; structured NWS alert behavior remains a documented follow-up.
- Both tabs meet the documented keyboard and screen-reader expectations.

## Phase 6 — Performance, resilience, and PWA option

**Status: Complete — July 3, 2026 (optional PWA deferred until after the initial web release)**

### Step 29: Optimize loading

- [x] Start independent requests concurrently.
- [x] Preconnect to provider origins.
- [x] Confirm current conditions do not wait for ten-day rendering.
- [x] Remove or replace oversized dependencies.
- [x] Verify production bundle budgets.

### Step 30: Harden network behavior

- [x] Test slow, offline, timeout, malformed, and partial responses.
- [x] Confirm stale content cannot appear fresh.
- [x] Add manual per-section or global refresh behavior.
- [x] Prevent rapid repeated refresh calls.

### Step 31: Add an installable PWA only if desired

- [ ] Add manifest and icons.
- [ ] Cache the application shell.
- [ ] Do not treat cached forecast data as indefinitely fresh.
- [ ] Test update behavior to avoid a stranded old application build.

PWA support is optional and must not delay a correct responsive web release.
The initial release will remain a standard static web application. A service
worker is deferred because an installable shell does not justify the additional
update and stale-forecast failure modes before the first production release.

### Phase 6 exit criteria

- Production budgets are met or exceptions are documented.
- The application degrades cleanly during provider and network failures.
- Cached data always carries accurate age/freshness language.

## Phase 7 — Release and deployment

**Status: Release candidate ready — July 3, 2026 (repository-owner publication, production smoke checks, and manual screen-reader/zoom sign-off remain)**

### Step 32: Complete release testing

- [x] Run all unit, component, and browser tests.
- [x] Complete the time-zone test matrix.
- [x] Capture required mobile, tablet, and desktop screenshots.
- [x] Complete keyboard-flow checks.
- [ ] Complete repository-owner screen-reader and `200%` zoom checks.
- [x] Compare NOAA events against the official station page.

### Step 33: Configure static hosting

- [x] Choose GitHub Pages as the eligible free personal-project host.
- [x] Configure automatic root/project base paths and asset URLs.
- [x] Document GitHub Pages HTTPS and host-managed cache behavior.
- [ ] Enable and verify HTTPS on the published repository.
- [x] Verify direct URLs with query-string view selection locally.

### Step 34: Deploy

- [x] Build from a clean locked install.
- [x] Configure the workflow to publish only generated `dist/` output.
- [ ] Publish from the repository-owner GitHub account.
- [ ] Run production post-deployment smoke checks.
- [x] Record the release-candidate date and source/provider terms reviewed.

### Step 35: Establish maintenance

- [x] Enable weekly dependency update notifications.
- [x] Schedule monthly provider contract checks.
- [x] Record threshold review before each swimming season.
- [x] Track provider quota or policy changes in the maintenance checklist.
- [x] Keep a short release log.

### Phase 7 exit criteria

- The production URL passes all deployment checklist items.
- Both tabs work on mobile and desktop.
- Live Sandbridge values, tide predictions, attribution, and source links are correct.
- The project has an owner and maintenance cadence.

The implementation-side Phase 7 work is complete. The production URL exit
criteria remain open until the repository owner follows
[DEPLOYMENT.md](DEPLOYMENT.md), publishes the site, and records the production
checks.

## 3. Suggested milestone grouping

| Milestone              | Phases | Demonstrable outcome                                        |
| ---------------------- | ------ | ----------------------------------------------------------- |
| M1: Data foundation    | 0–2    | Tested Sandbridge domain model and derived rules            |
| M2: Usable dashboard   | 3      | Responsive live current conditions in both tabs             |
| M3: Complete MVP       | 4–5    | Tide chart, ten-day views, safety/provenance, accessibility |
| M4: Production release | 6–7    | Resilient, optimized, deployed static application           |

## 4. Definition of done

A task is done only when:

- Implementation and types are complete.
- Boundary and failure tests are added.
- Loading, stale, unavailable, and error states are considered.
- Mobile and keyboard behavior is verified.
- User-facing source and estimation language remains accurate.
- Documentation changes with any altered behavior or threshold.
