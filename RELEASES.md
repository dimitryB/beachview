# Release log

## 0.1.0 release candidate — July 3, 2026

Phase 7 prepares the first complete VABeachCast release for GitHub Pages.

Included:

- Responsive Swimming and Fishing views
- Normalized Open-Meteo weather and marine forecasts
- NOAA Sandbridge high/low predictions and an estimated tide curve
- Ten-day Swimming and Fishing outlooks
- Provider-isolated caching, stale/offline behavior, and scoped refreshes
- Automated accessibility, time-zone, resilience, and browser checks
- GitHub Pages deployment with automatic project-site base paths
- Weekly dependency updates and a monthly live-provider contract smoke test

Release verification:

- Live provider contract check returned 240 weather hours, 240 marine hours,
  and 12 alternating NOAA MLLW extrema for station `8639428` on July 3, 2026.
- Open-Meteo attribution and licensing were reviewed against the
  [Open-Meteo license](https://open-meteo.com/en/license) and
  [terms](https://open-meteo.com/en/terms) on July 3, 2026.
- NOAA metric API extrema matched the official Sandbridge station page on July
  3, 2026: the page's `4:27 AM` low (`0.14 ft`), `10:35 AM` high (`2.92 ft`),
  and `4:23 PM` low (`0.50 ft`) corresponded to the API's `0.044 m`, `0.890 m`,
  and `0.152 m` predictions.
- Production URL and post-deployment verification: pending repository-owner
  publication.
- Manual screen-reader and `200%` zoom sign-off: pending repository-owner
  verification on the production URL.

Maintenance owner: the GitHub repository owner. Dependabot runs weekly,
provider contract checks run monthly, and thresholds are reviewed before each
swimming season.
