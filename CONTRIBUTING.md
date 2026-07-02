# Contributing

## Setup

Requirements:

- Node.js `22` or another version supported by the pinned toolchain
- npm

Install and start the local application:

```sh
npm ci
npm run dev
```

## Required checks

Run these before handing off a change:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Install the Playwright Chromium runtime once if it is not already available:

```sh
npx playwright install chromium
```

## Working conventions

1. Read `AGENTS.MD` and the relevant root-level product documentation.
2. Keep all provider-specific response handling inside data adapters.
3. Preserve the fixed Sandbridge location, metric units, and Eastern timezone.
4. Add tests for rule boundaries, time conversion, missing values, and partial failure.
5. Update documentation when behavior, thresholds, or architecture changes.
6. Do not commit generated build output, local environment files, or raw provider dumps.

Use concise, imperative commit messages.
