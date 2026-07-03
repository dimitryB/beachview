# Release screenshots

The PNG files in this directory are generated from mocked provider data at a
fixed clock, so provider availability and live forecast changes do not alter
the review baseline.

Regenerate the five Phase 7 viewport captures with:

```sh
npm run screenshots:release
```

The command captures mobile Swimming and Fishing, tablet Swimming, and desktop
Swimming and Fishing from the production build.
