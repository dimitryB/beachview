# Repository Agent Guide

## Scope

These instructions apply to the entire repository.

VABeachCast is a static, dark-themed, metric-only beach conditions application for Sandbridge Beach in Virginia Beach, Virginia. Phases 0 through 3 are complete; tide-chart and extended-forecast presentation are the next implementation phase.

## Read first

Use the documentation as the source of truth:

1. [README.md](README.md)
2. [Product requirements](PRODUCT_REQUIREMENTS.md)
3. [Data sources and decision rules](DATA_AND_RULES.md)
4. [Technical architecture](TECHNICAL_ARCHITECTURE.md)
5. [UX and visual design](UX_DESIGN.md)
6. [Testing and operations](TESTING_AND_OPERATIONS.md)
7. [Implementation roadmap](IMPLEMENTATION_ROADMAP.md)

Update the relevant document when implementation changes a requirement, threshold, data contract, or architectural decision.

## Product invariants

Do not change these without explicit user approval:

- Location: Sandbridge Beach at `36.6917, -75.9200`
- Display timezone: `America/New_York`
- NOAA tide station: `8639428`
- NOAA tide datum: `MLLW`
- Units: Celsius, meters, km/h, seconds, hPa, and degrees/cardinal labels
- Default view: Swimming
- Secondary view: Fishing
- Theme: dark only for the initial release
- Forecast target: up to ten days

## Safety and data language

- Never label conditions “safe to swim.”
- Describe Open-Meteo values as modeled data.
- Describe NOAA high/low values as predictions.
- Describe heights and phases between NOAA extrema as estimates.
- Do not present generic fishing windows as species-specific guarantees.
- Official alerts and beach advisories must visually and semantically outrank derived comfort states.
- Never display an unavailable numeric value as zero.
- Cached or stale values must show their age.

## Intended implementation

Unless the user directs otherwise:

- Use Vite, React, and strict TypeScript.
- Keep the output deployable as a static application.
- Do not add a backend, database, authentication, or paid dependency.
- Keep provider response shapes inside data adapters.
- Normalize all provider data before it reaches components.
- Use a lightweight custom SVG tide chart instead of a large chart library.
- Keep rule thresholds in configuration rather than UI components.
- Start independent provider requests concurrently and support partial success.

Follow the source structure proposed in [Technical Architecture](TECHNICAL_ARCHITECTURE.md).

## Code quality

- Prefer small pure functions for tide, time, wind, pressure, and comfort calculations.
- Treat time-zone conversion and threshold boundaries as high-risk logic.
- Use semantic HTML and preserve keyboard and screen-reader access.
- Color must never be the sole status indicator.
- Keep the initial bundle within the documented performance budget.
- Avoid adding dependencies when a small, readable local implementation is sufficient.

## Testing expectations

When the application scaffold exists, run the repository-provided equivalents of:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Until those scripts exist, validate documentation with:

```sh
git diff --check
rg -n '[[:blank:]]+$' ./*.md
```

Required test coverage includes:

- Exact rule boundaries
- Missing and malformed provider data
- Partial provider failures
- Stale-cache behavior
- NOAA timestamps around midnight and daylight-saving transitions
- Tide interpolation and estimated-label behavior
- Keyboard, responsive, and graph-alternative flows

## Change workflow

1. Read the relevant requirements and roadmap phase.
2. Inspect the current worktree and preserve unrelated user changes.
3. Implement the smallest complete vertical slice.
4. Add or update tests for boundaries and failure states.
5. Update documentation when behavior or decisions change.
6. Run the checks appropriate to the changed files.
7. Summarize changed files, validation, and remaining product decisions.

Use concise, imperative commit messages. Do not commit generated build output, secrets, local environment files, or provider response dumps.
