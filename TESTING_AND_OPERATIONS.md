# Testing and Operations

## 1. Quality objectives

The highest-risk failures are not visual polish defects. They are:

- Incorrect unit or threshold boundaries
- Tide events displayed on the wrong local day
- Estimated tide values presented as observed
- A provider failure hiding valid data from another provider
- Stale conditions appearing current
- A comfort match visually overriding an official hazard

Testing should prioritize these cases.

## 2. Test layers

### 2.1 Unit tests

Unit-test pure domain behavior:

- Wind-degree normalization and all 16 cardinal boundaries
- Pressure tendency boundaries
- Wave, period-plus-height choppiness, temperature, wind, and exposure rules
- Circular wind-direction differences across north, such as `350° → 10°`
- Tide phase before, near, and after each event
- Cosine tide interpolation at start, midpoint, and end
- Local-day grouping across midnight and daylight-saving transitions
- Late-day window qualification and tie-breaking
- Custom-rule boundaries and cross-field configuration validation
- Fishing movement midpoint calculations
- Missing, `null`, `NaN`, and malformed inputs

Every comparison boundary requires a test on both sides and at equality. Choppiness tests must cover the period and wave-height thresholds together, including a short period at, below, and above the configured height gate.

### 2.2 Provider adapter tests

Store small, reviewed response fixtures for:

- Normal weather response
- Normal marine response
- Normal NOAA high/low response
- Missing hourly value
- Empty provider array
- Provider error object returned with HTTP 200
- HTTP error status
- Response shape change

Tests assert normalized domain output, not snapshots of the entire provider payload.

### 2.3 Component tests

Verify:

- Metric value, unit, status label, and explanation remain associated.
- Current Swimming cards expose each configured flag with a non-color cue.
- Current Fishing cards expose predicted tide phase, modeled wind, and modeled pressure tendency without comfort language.
- Unavailable data does not render as zero.
- Cached and stale labels appear correctly.
- Cached and stale labels show relative age, with the exact Eastern timestamp available as detail.
- Structurally incomplete or timestamp-invalid cache entries are discarded before rendering.
- Alert banners precede comfort content.
- Tabs expose selected/current state.
- Config inputs retain labels/units, reject inconsistent values, persist after
  reload, survive corrupt storage, and restore defaults.
- Short-period presentation becomes choppy only above the configured wave-height gate.
- Tide summaries and event tables contain chart-equivalent information.
- Retry actions call only the affected provider when appropriate.
- Offline state explains that saved values may be shown.

### 2.4 Browser tests

Critical Playwright flows:

1. First visit opens Swimming.
2. Fishing deep link loads and browser navigation works.
3. All successful providers render.
4. Weather succeeds while marine fails.
5. Marine succeeds while NOAA fails.
6. Cache renders before a delayed refresh.
7. Failed refresh retains stale cached content.
8. Manual refresh updates timestamps.
9. Mobile forecast cards can be reached by touch-equivalent and keyboard interaction.
10. Official alert remains visible in both tabs.
11. Automated axe scans report no WCAG A/AA violations on every view and a partial-provider failure.
12. Content reflows at a `320 px` CSS viewport and loading animation stops under reduced-motion preference.
13. A slow provider does not block successful current-condition sections.
14. Current conditions render while a deferred ten-day presentation chunk is pending.
15. Offline and failed refreshes retain cached values with stale language.
16. Malformed provider data remains isolated from valid feeds.
17. Manual refresh replaces values and advances the provider cache timestamp.
18. Config changes alter derived Swimming/Fishing results and persist after a
    reload without changing provider responses.

Mock provider responses for deterministic CI. Keep one optional live smoke test separate from required CI.

## 3. Time-zone test matrix

Use fixed clocks and include:

| Scenario                          | Expected behavior                                          |
| --------------------------------- | ---------------------------------------------------------- |
| Viewer device set to Pacific time | Every displayed time remains Eastern                       |
| Event just after `00:00 UTC`      | Assigned to the correct prior Eastern date when applicable |
| Spring DST transition             | Missing local hour does not create a fake forecast record  |
| Fall DST transition               | Repeated local hour remains distinguishable internally     |
| High tide near local midnight     | Appears on exactly one correct day                         |
| Ten-day range crossing DST        | Day cards remain ordered and correctly grouped             |
| App remains open past tide event  | Passed event disappears using the advancing live clock     |
| Invalid date such as February 30  | Provider payload and cached payload are rejected           |

NOAA fixtures should use GMT output and explicit UTC parsing.

## 4. Visual regression

Capture stable screenshots with mocked data for:

- Mobile Swimming and Fishing
- Tablet Swimming
- Desktop Swimming and Fishing
- Loading skeleton
- Partial failure
- Stale cache
- Official alert
- No matching swim window
- Negative NOAA low-tide height

Use a small tolerance and review intended changes rather than automatically accepting broad diffs.

## 5. Accessibility verification

Automated:

- axe checks on every view and important states
- ESLint accessibility rules
- Color-contrast checks for tokens and status pairs

Manual:

- Complete primary flows with keyboard only.
- Test VoiceOver on Safari or another platform screen reader.
- Confirm logical announcement order for updated sections.
- Inspect the tide chart’s text and table alternative.
- Check at `200%` browser zoom.
- Enable reduced motion and increased contrast where supported.

Automated checks do not replace manual assistive-technology review.

## 6. Performance verification

Test a production build, not the development server.

Measure:

- JavaScript and CSS transfer size
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift
- Time from navigation to current conditions
- Time to cached content
- Individual provider latency

Test profiles:

- Desktop broadband
- Mid-tier mobile with throttled network/CPU
- Empty cache
- Warm cache
- One slow provider

The application should not wait for the ten-day forecast or NOAA tide response before showing successful primary values.
`npm run build` also runs the gzip bundle-budget check and fails when the
initial JavaScript reaches `150 KB` or the initial CSS reaches `30 KB`.

## 7. Live API smoke checks

Run live checks manually before release and on a low-frequency schedule if a suitable free CI allowance exists.

Checks:

- Endpoint returns success.
- Expected top-level fields exist.
- Current/hourly arrays have compatible lengths.
- Units are the requested metric units.
- NOAA returns alternating high/low records for the covered range.
- Forecast coverage reaches the dates the UI intends to show.
- Attribution requirements have not changed.

Live tests should report a provider issue without blocking unrelated local development.

## 8. Failure behavior

| Failure                  | Required response                                              |
| ------------------------ | -------------------------------------------------------------- |
| Request timeout          | Use valid cache or show provider-specific error                |
| HTTP error               | Same as timeout; log safe diagnostic information               |
| Invalid JSON             | Reject adapter result; never partially trust malformed content |
| Missing metric           | Render that metric unavailable                                 |
| Misaligned hourly arrays | Reject or safely truncate with an explicit adapter diagnostic  |
| NOAA error object        | Show tide unavailable; retain valid cached events              |
| Offline browser          | Render cached sections and clear offline status                |
| Expired official alert   | Remove it even if it exists in cache                           |

Do not retry aggressively. One controlled retry with jitter is sufficient for transient current-data failures; manual refresh remains available.

## 9. Logging and privacy

The MVP does not require remote analytics.

Development logging may include:

- Provider name
- HTTP status
- Duration
- Validation error category
- Cache hit/miss

Do not log complete alert descriptions, user IP information, or device identifiers. Production console output should be quiet except for actionable errors.

## 10. Continuous integration

Required checks for every change:

1. Install with a locked dependency graph.
2. Format check.
3. ESLint.
4. TypeScript type check.
5. Unit and component tests.
6. Production build.
7. Critical mocked Playwright flows.

Deployment runs only after required checks pass on the default branch.

## 11. Deployment checklist

- [x] Production build completes with no warnings requiring action.
- [x] All required CI-equivalent checks pass locally.
- [x] Bundle sizes remain within budget.
- [x] API URLs contain Sandbridge coordinates and metric options.
- [x] NOAA station is `8639428` and datum is `MLLW`.
- [x] Display timezone is fixed to `America/New_York`.
- [x] Open-Meteo and NOAA attribution is visible.
- [x] Safety and estimation language is present.
- [x] Official source links work.
- [x] Cache schema version is current.
- [ ] Both tab URLs work on the static host.
- [x] A cache-busting deployment strategy is configured for application assets.
- [ ] The HTML shell itself is not cached indefinitely.
- [x] Mobile, tablet, desktop, and keyboard smoke checks pass.
- [ ] Production screen-reader and `200%` zoom smoke checks pass.

The unchecked host-dependent items are completed after publication by following
[DEPLOYMENT.md](DEPLOYMENT.md). The local prefixed-path deployment smoke check
passes at `/beachview/`, including the direct Fishing query URL.

## 12. Post-release checks

After deployment:

1. Open both views in a clean browser profile.
2. Compare the first NOAA high/low events with the official station page.
3. Confirm current values show plausible units and timestamps.
4. Simulate offline mode and verify cached-state language.
5. Verify a direct Fishing URL works.
6. Confirm provider requests are parallel in the network panel.
7. Recheck the app after the next model refresh.

## 13. Maintenance cadence

Monthly:

- Review dependency and security updates.
- Run live provider contract checks.
- Confirm source links and attribution.
- Inspect free-tier usage if the provider exposes it.

Before swimming season:

- Recheck VDH and NWS links.
- Review condition thresholds and product language.
- Validate the app against several real Sandbridge days.

Before a major release:

- Repeat the full accessibility and visual review.
- Reconfirm host and provider free-tier terms.
- Increment the cache schema if normalized data shapes change.
