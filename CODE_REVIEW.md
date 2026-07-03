# Code Review — VABeachCast (beachview)

Date: 2026-07-02 · Scope: full codebase (~6,900 lines TS/TSX) at commit `5e40dc1` ("Implement Phase 2 derived behavior")

Checks: `typecheck` ✅ · `lint` ✅ · Playwright last run ✅ (unit tests could not be re-run in the review sandbox — macOS-native `node_modules` and a throttled registry; note the suite passes _with_ bug C1 present, see below)

> **Status update (same day):** C1 and M1–M10 have been fixed in the working tree, with regression tests added for C1, M1, M2, M3, M4, M5, and M10. `typecheck`, `lint`, and `format:check` pass after the fixes. Run `npm test` and `npm run test:e2e` locally to confirm the suites (the review sandbox cannot execute them).

## Verdict

Unusually disciplined codebase for its stage: strict validation, frozen test-locked config, spec-driven boundary tests, DST-aware time handling, clean provider isolation. The problems cluster at **cross-layer seams** — where GMT provider data meets Eastern local time, and where domain logic meets the views. One bug is critical and season-dependent.

---

## Critical

### C1. GMT solar days break swim windows all summer (verified)

`src/data/open-meteo-weather.ts:83` requests `timezone=GMT`, so `SolarDay.providerDate` is a **GMT** calendar day. `src/domain/forecast-blocks.ts:420,436` matches it against **Eastern** local dates.

At Sandbridge in summer, local sunset (~20:15 EDT) is after 00:00 UTC of the _next_ GMT day, so GMT day "2026-07-02" carries the sunset of Eastern July **1**. `buildLateDayHours` (line ~366, `milliseconds < sunsetMilliseconds`) then filters out every late-day hour → every summer day evaluates `"incomplete"` and the core late-day swim-window feature never fires during beach season. It works in winter, which hides it.

Tests pass because fixtures in `forecast-blocks.test.ts:51,223` hand-build a providerDate/sunset pairing the real pipeline never produces.

**Fix:** key/match solar days by the Eastern local date of the sunset instant (`localDateForInstant(day.sunsetAt)`), not `providerDate`. Add a July-realistic fixture that fails against current code.

---

## Major

### Spec gaps

- **M1. Alert-overlap rule (§13.4) unimplemented** — `fishing.ts:162`: movement-window candidacy is wind-only; `buildFishingForecast` accepts no `OfficialAlert[]` input, so a favorable window can coexist with a severe weather alert, violating §14 precedence. Thread alerts through and clear `isCandidate` on overlap.
- **M2. Wind-shift detection** — `wind.ts:117–166`: compares only against the sample ~exactly 6h earlier, so (a) fast 2–3h shifts (sea-breeze pulses) are missed, (b) one persistent shift emits ~5–6 duplicate `WindShift` timeline entries (no dedupe in `fishing.ts:212–217`). Spec says "≥45° within 6 hours." Accumulate change across the window and merge overlapping detections.

### Data/hooks

- **M3. Refresh race** — `use-beach-data.ts:103–164`: no request token or abort; a slow in-flight request can overwrite newer data, and an old failure can flip fresh data to `stale` with a bogus error. Add a per-provider sequence ref and ignore superseded resolutions.
- **M4. No abort plumbing** — `fetch-json.ts` accepts no caller `AbortSignal`; nothing can cancel in-flight requests or retry sleeps. Add `signal` to `JsonFetchRequest`, combine with the timeout controller.

### UI/a11y

- **M5. No focus management on navigation** — `App.tsx:27–34`: `navigate()` never moves focus or updates `document.title`; SPA view changes are silent for screen readers. `<main id="main-content" tabIndex={-1}>` already exists — focus it after `setView`.
- **M6. Hard-coded weekday labels** — `ForecastPlaceholder.tsx:8`: `["Today","Fri","Sat","Sun"]` renders wrong day names on 6 of 7 days. Derive from `Date.now()` + `BEACH.timezone` or use neutral labels.
- **M7. Missing attribution** — footer has no Open-Meteo/NOAA sources block. Open-Meteo is CC-BY (attribution required); UX_DESIGN §2 and TESTING_AND_OPERATIONS §11 both call for it.

### Tooling

- **M8. e2e tests the dev server, not the build** — `playwright.config.ts:24`: `npm run dev` on port 4173 (the _preview_ port). TESTING_AND_OPERATIONS §6 mandates testing the production build. Use `npm run build && npm run preview`.
- **M9. e2e is type-checked by nothing** — `e2e/app.spec.ts` is in neither tsconfig; `tsc -b` and CI skip it. Add `"e2e"` to `tsconfig.node.json` include.

### Architecture

- **M10. Views re-implement domain logic** — `SwimmingPage.tsx:44–151` has its own `flagPriority()`/readiness derivation while `comfort.ts` already exports `assessSwimConditions()`/`TONE_PRIORITY` — with _different_ priorities (page ranks `unavailable` lowest; domain ranks it highest, per spec §14). Two sources of truth will drift. Move derivation into a unit-tested `deriveSwimmingSummary(data)` and make pages presentational.

---

## Refactoring opportunities

1. **Provider client duplication** — `expectUnit`, `modeledPoint`, `error===true` handling, grid construction copy-pasted between `open-meteo-weather.ts` and `open-meteo-marine.ts`. Extract `src/data/open-meteo-common.ts`.
2. **Refresh triplication** — `refreshWeather/Marine/Tides` are identical modulo fetcher/setter. A `makeRefresher(fetcher, setState)` factory collapses ~60→20 lines and gives one place to fix M3.
3. **Page duplication** — `MODELED_ASSESSMENT`, `modeledMeta()`, and wind supporting-text are duplicated verbatim between SwimmingPage and FishingPage. Extract `describeWind(weather)` + a shared `<WindConditionCard>` and section scaffold.
4. **`useCurrentTime`** — one unsynchronized `setInterval` per consumer (~6 per page) plus a guaranteed extra mount render. Use a module-level ticker via `useSyncExternalStore`.
5. **Predicate duplication** — `isRecord` defined in both `domain-guards.ts` and `cache.ts`; export from one module.

---

## Minor (selected)

- **Freshness never decays on screen** — a `"fresh"` dataset stays visually fresh forever while the tab is open; derive display status from `fetchedAt` + `CACHE_POLICIES` + now (`use-beach-data.ts` / `DataStatus.tsx`).
- **Cache TTLs vs docs** — current-conditions fallback documented at 6h but cached under the 12h forecast policy; NOAA stale threshold 12h vs documented 24h (`cache.ts:49–62`). Align code or docs.
- **Timeout during body read misclassified as `parse`** (non-retryable) — `fetch-json.ts:78–89`: check `controller.signal.aborted` in the catch.
- **NOAA `begin_date` window** doesn't cover the full previous Eastern day the filter assumes (`noaa-tides.ts:46` vs `:138`); derive request dates from the same local-day math.
- **Sunrise/sunset `null` unreachable** — types/guards allow `null` but the parser throws on any null entry, rejecting the whole dataset (`open-meteo-weather.ts:295`).
- **Midday radiation window** is 11:00–15:59 vs spec's 11:00–15:00 (`comfort.ts:212`).
- **Pressure label** hardcodes "/ 3 h" while tolerance allows a 1.5–4.5h-old comparison sample (`pressure.ts:105`, `rules.ts:30`).
- **`?? 0` on timestamps** in `fishing.ts:268` can misfile a tide range to 1970; skip on null instead.
- **Text bugs**: "Cloud unavailable%" / "gust unavailable km/h" (`SwimmingPage.tsx:147,137`); lowercase "weather data is unavailable" (`ProviderNotice.tsx:15`).
- **a11y**: `aria-label` on plain `<div>`s (TidePlaceholder, ForecastPlaceholder); SafetyNotice `<h2>` precedes the page `<h1>`; brand link full-reloads instead of client routing (`AppHeader.tsx:11`).
- **"Today at Sandbridge"** can show tomorrow's tides (`TidePlaceholder.tsx:20`); rename or filter by local date.
- **CSS**: spacing tokens defined but raw px used nearly everywhere; warning/danger alpha colors hard-coded ~15× instead of `color-mix` on tokens.
- **CI**: no `concurrency` cancel-in-progress; no Playwright report/trace artifact upload on failure.
- **Dead code**: `time.ts` `addMilliseconds`/`signedHoursBetween` unused; dead clamp in `tide.ts:129`; `.condition-grid--fishing` duplicate rule.

## Test-coverage gaps worth closing

- A July-realistic solar-day fixture (would catch C1).
- fetch-json: retry exhaustion, 429/timeout retry paths.
- noaa-tides: empty `predictions`, window-filter boundaries.
- use-beach-data: concurrent refresh ordering (would catch M3); cache-write on success.
- Open-Meteo adapters: unit-mismatch rejection (headline defense, untested).
- wind: fast sub-6h shift, duplicate suppression.
- time.ts: spring-forward DST, invalid inputs.

## Done well

Strict ISO timestamp validation with calendar round-trip; paranoid cache revalidation (full domain-guard recheck + policy recompute); per-provider failure isolation via `Promise.allSettled` with stale-data retention; frozen config with test-locked thresholds (drift fails CI); correct §14 tone precedence in the domain layer; DST-safe local-day grouping; modifier-key-aware SPA nav links; `prefers-reduced-motion`/`forced-colors`/44px targets/skip link; deterministic e2e provider mocking with a 320px overflow check. Docs are exceptional and mostly match the code.

## Suggested order of attack

1. C1 (swim windows) — it's July; the flagship feature is broken right now.
2. M3 + M4 (race/abort) and M10 (move page logic into domain) — correctness + drift prevention.
3. M8 + M9 (e2e against prod build, type-check e2e) — cheap CI wins.
4. M5–M7 (focus, day labels, attribution).
5. Refactors 1–3 opportunistically as those files are touched.
