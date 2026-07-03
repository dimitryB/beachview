# VABeachCast

VABeachCast is a dark-themed, metric-only beach conditions application focused on Sandbridge Beach in Virginia Beach, Virginia. It combines marine forecasts, weather forecasts, and official tide predictions into two task-oriented views:

- **Swimming**: current comfort conditions, tide position, and late-day swim windows.
- **Fishing**: tide phase, pressure tendency, wind behavior, and candidate casting windows.

The application is intended to be a lightweight static web app that can run on a free hosting tier without a database or application server.

> Working product name: **VABeachCast**. It describes both swimming and fishing more accurately than the wave- or surf-specific alternatives.

## Project status

Phases 0 through 2 are complete. The application now has a responsive dark shell; strict normalized weather, marine, and tide data; resilient provider caching; and tested derived behavior for wind shifts, pressure tendency, tide phase and height estimation, swim comfort rules, late-day swim windows, and fishing timelines.

## Fixed operating scope

| Setting           | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Primary location  | Sandbridge, Virginia Beach, Virginia                            |
| Coordinates       | `36.6917, -75.9200`                                             |
| NOAA tide station | `8639428 — Sandbridge`                                          |
| Display timezone  | `America/New_York`                                              |
| Units             | Celsius, meters, km/h, seconds, hPa, degrees/cardinal direction |
| Default view      | Swimming                                                        |
| Theme             | Dark only                                                       |
| Forecast horizon  | 10 days where source coverage permits                           |

## Recommended implementation

- Vite, React, and TypeScript
- Mobile-first semantic HTML and CSS
- A custom SVG tide graph rather than a large chart dependency
- Open-Meteo Weather and Marine APIs
- NOAA CO-OPS tide predictions
- Optional National Weather Service alerts and surf-zone information
- Vitest for domain logic and Playwright for critical browser flows
- Static deployment to GitHub Pages or another personal-project free tier

The app should call its independent feeds in parallel, normalize every response into internal metric-only types, cache the last successful result in the browser, and render each section independently when a provider is unavailable.

## Important product language

This product summarizes conditions; it does not determine whether swimming is safe.

- A NOAA tide prediction is not an observed water level.
- The continuous Sandbridge tide curve is estimated between official high/low predictions.
- A highlighted swim window means the configured comfort rules match, not that the ocean is safe.
- A fishing window is a general tide-and-wind signal, not a species-specific guarantee.
- Official warnings, beach flags, lifeguard instructions, rip-current guidance, and swimming advisories take priority.

## Documentation

| Document                                             | Purpose                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Product requirements](PRODUCT_REQUIREMENTS.md)      | Scope, user outcomes, normalized requirements, and acceptance criteria          |
| [UX and visual design](UX_DESIGN.md)                 | Information architecture, layouts, components, visual tokens, and accessibility |
| [Technical architecture](TECHNICAL_ARCHITECTURE.md)  | Application structure, request flow, caching, time handling, and performance    |
| [Data sources and decision rules](DATA_AND_RULES.md) | API mappings, tide estimation, comfort rules, and fishing signals               |
| [Testing and operations](TESTING_AND_OPERATIONS.md)  | Quality strategy, failure cases, deployment, and production checks              |
| [Implementation roadmap](IMPLEMENTATION_ROADMAP.md)  | Step-by-step delivery plan with phase exit criteria                             |
| [Contributing](CONTRIBUTING.md)                      | Local setup, required checks, and working conventions                           |

## External documentation

- [Open-Meteo Weather API](https://open-meteo.com/en/docs)
- [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api)
- [NOAA CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/prod/)
- [NOAA Sandbridge station metadata](https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8639428.json?expand=details,products)
- [NWS Wakefield surf-zone forecast](https://forecast.weather.gov/product.php?issuedby=AKQ&product=SRF&site=NWS)
- [Virginia Department of Health beach monitoring](https://www.vdh.virginia.gov/waterborne-hazards-control/beach-monitoring/)

## Recommended next action

Begin Phase 3 in the [implementation roadmap](IMPLEMENTATION_ROADMAP.md): connect the completed derived behavior to current-condition cards, semantic status flags, and the Fishing dashboard.
