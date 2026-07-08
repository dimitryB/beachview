# Data Sources and Decision Rules

## 1. Configuration

```ts
export const BEACH = {
  name: "Sandbridge Beach",
  region: "Virginia Beach, Virginia",
  latitude: 36.6917,
  longitude: -75.92,
  timezone: "America/New_York",
  noaaTideStation: "8639428",
} as const;
```

These values are application configuration, not user preferences.

### 1.1 Recommendation preferences

`SWIM_RULES` contains the factory defaults for comfort flags and candidate-window decisions. The Config view lets the user replace these thresholds locally. A versioned `vabeachcast:recommendation-config` entry stores the complete validated rule set in browser `localStorage`; no provider payload or official warning is changed.

Stored values must be finite, inside the input-specific bounds, and satisfy these relationships:

- Cold-water threshold is lower than the warm-water threshold.
- Wind and gust warning thresholds do not exceed their corresponding strong thresholds.
- Lower-exposure UV and radiation values do not exceed their warning values.
- Midday start is not later than midday end.
- Time-window hours and minimum duration are whole numbers.

Missing, corrupt, incompatible, or invalid storage uses the factory defaults. Restoring defaults removes the stored preference entry. Version 1 preference entries are migrated by adding the default choppy-height gate while preserving their other valid values.

## 2. Source catalog

| Provider                      | Purpose                                                   | Data character                                  |
| ----------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Open-Meteo Weather            | Air, wind, pressure, cloud, UV, radiation, sunrise/sunset | Modeled current conditions and forecast         |
| Open-Meteo Marine             | Waves, periods, sea-surface temperature                   | Modeled current conditions and forecast         |
| NOAA CO-OPS                   | Sandbridge high/low tide times and heights                | Official astronomical prediction                |
| NWS                           | Active hazards and Sandbridge surf-zone guidance          | Official warning/forecast, optional integration |
| Virginia Department of Health | Beach swimming advisories                                 | Official status link; no stable app API assumed |

## 3. Open-Meteo Weather

Documentation: [Open-Meteo Weather API](https://open-meteo.com/en/docs)

Suggested request:

```text
https://api.open-meteo.com/v1/forecast
  ?latitude=36.6917
  &longitude=-75.9200
  &current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,is_day
  &hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,direct_radiation,uv_index
  &daily=sunrise,sunset
  &forecast_days=10
  &timezone=GMT
  &temperature_unit=celsius
  &wind_speed_unit=kmh
```

### Mapping

| API field            | Domain field            | Unit           |
| -------------------- | ----------------------- | -------------- |
| `temperature_2m`     | Air temperature         | °C             |
| `wind_speed_10m`     | Sustained wind          | km/h           |
| `wind_direction_10m` | Wind-from direction     | degrees        |
| `wind_gusts_10m`     | Wind gust               | km/h           |
| `pressure_msl`       | Sea-level pressure      | hPa            |
| `cloud_cover`        | Total cloud cover       | percent        |
| `direct_radiation`   | Direct solar radiation  | W/m²           |
| `uv_index`           | UV index                | index          |
| `sunrise`, `sunset`  | Solar boundary instants | UTC internally |

The implementation requests GMT timestamps so every internal instant is unambiguous. Display formatting and local-day grouping always use `America/New_York`.

## 4. Open-Meteo Marine

Documentation: [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api)

Suggested request:

```text
https://marine-api.open-meteo.com/v1/marine
  ?latitude=36.6917
  &longitude=-75.9200
  &current=wave_height,wave_period,sea_surface_temperature
  &hourly=wave_height,wave_period,sea_surface_temperature
  &forecast_days=10
  &timezone=GMT
  &length_unit=metric
  &velocity_unit=kmh
  &cell_selection=sea
```

### Mapping

| API field                 | Domain field            | Unit |
| ------------------------- | ----------------------- | ---- |
| `wave_height`             | Significant wave height | m    |
| `wave_period`             | Mean wave period        | s    |
| `sea_surface_temperature` | Sea-surface temperature | °C   |

### Limitations

- Output is model data, not a reading at the sand.
- The selected marine cell can be several kilometers offshore.
- Sea-surface temperature does not necessarily equal shallow surf-zone temperature.
- Coastal model resolution and local bathymetry limit precision.
- Missing values must remain unavailable rather than being interpolated across long gaps.

## 5. NOAA tide predictions

Documentation:

- [NOAA CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/prod/)
- [Sandbridge station metadata](https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8639428.json?expand=details,products)

Request template:

```text
https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
  ?begin_date={YYYYMMDD}
  &end_date={YYYYMMDD}
  &station=8639428
  &product=predictions
  &datum=MLLW
  &time_zone=gmt
  &interval=hilo
  &units=metric
  &application=VABeachCast
  &format=json
```

Use a buffered request range and filter after converting the returned UTC times into `America/New_York`.

### Mapping

| API field | Meaning                                     |
| --------- | ------------------------------------------- |
| `t`       | Predicted event time                        |
| `v`       | Predicted height in meters relative to MLLW |
| `type: H` | High tide                                   |
| `type: L` | Low tide                                    |

### Required terminology

- “Predicted high tide”
- “Predicted low tide”
- “Estimated tide position”
- “Meters above/below MLLW” where datum detail is shown

Do not call the values observed, measured, or real-time water levels.

## 6. Optional official safety sources

### 6.1 NWS active alerts

Documentation: [NWS API](https://www.weather.gov/documentation/services-web-api)

```text
https://api.weather.gov/alerts/active?point=36.6917,-75.9200
```

Only unexpired, geographically applicable alerts should be shown. Preserve the NWS headline, severity, effective/expiry times, and source link. Sanitize any provider text before rendering.

### 6.2 NWS Surf Zone Forecast

[NWS Wakefield Surf Zone Forecast](https://forecast.weather.gov/product.php?issuedby=AKQ&product=SRF&site=NWS) includes a Virginia Beach section covering Virginia Beach and Sandbridge.

The product is semi-structured text. MVP behavior should be a prominent source link. Automated parsing is a follow-up because format changes could silently produce incorrect safety information.

### 6.3 Virginia swimming advisories

Provide a direct link to the [VDH swimming advisory map](https://www.vdh.virginia.gov/waterborne-hazards-control/swimming-advisories-and-monitored-beaches-map/). Do not scrape the page in the MVP.

## 7. Wind direction labels

Convert degrees into 16 cardinal sectors:

```text
N, NNE, NE, ENE, E, ESE, SE, SSE,
S, SSW, SW, WSW, W, WNW, NW, NNW
```

Directions describe where wind comes from. Normalize values into `[0, 360)` before selecting a sector.

## 8. Pressure tendency

Compare the closest current pressure value with the value approximately three hours earlier:

```text
delta = current pressure - pressure 3 hours earlier
```

Proposed classification:

| Three-hour change  | State   |
| ------------------ | ------- |
| `>= +1.0 hPa`      | Rising  |
| `<= -1.0 hPa`      | Falling |
| Between thresholds | Steady  |

Display both the state and signed change, for example `Falling −1.4 hPa / 3 h`.

If no valid comparison exists within a reasonable time tolerance, show “Tendency unavailable.”

## 9. Tide phase and estimated height

Find the official events immediately before and after the current instant.

### Phase

| Condition                   | Phase           |
| --------------------------- | --------------- |
| Within 30 minutes of a high | Near high slack |
| Within 30 minutes of a low  | Near low slack  |
| Next event is high          | Incoming        |
| Next event is low           | Outgoing        |
| Bounding events unavailable | Unavailable     |

The 30-minute slack band is a product display convention, not a NOAA current prediction.

### Estimated height

For adjacent events `(t0, h0)` and `(t1, h1)`:

```text
x = clamp((t - t0) / (t1 - t0), 0, 1)
estimatedHeight = h0 + (h1 - h0) × (1 - cos(π × x)) / 2
```

The UI must expose `t0`, `h0`, `t1`, and `h1` as official predicted events and identify the value between them as estimated.

## 10. Swimming condition rules

Rules are evaluated per forecast hour. Each metric returns a semantic state and explanation rather than only a color.

### 10.1 Default requirement thresholds

| Metric               | Rule                | State            |
| -------------------- | ------------------- | ---------------- |
| Wave height          | `>1.0 m`            | Red: high waves  |
| Wave period + height | `<7 s` and `>0.4 m` | Red: choppy      |
| Water temperature    | `<20°C`             | Cold warning     |
| Water temperature    | `>24°C`             | Warm-water alert |

At exactly `1.0 m`, wave height does not trigger the high-wave rule. At exactly `7 s`, period does not trigger the choppy rule. A short period at exactly `0.4 m` also does not trigger the choppy rule; the height must be strictly above the configured gate. When period is short but wave height is unavailable, the choppy assessment is unavailable rather than favorable. Boundary tests must preserve these semantics.

### 10.2 Default wind thresholds

| Metric         | Rule        | State                   |
| -------------- | ----------- | ----------------------- |
| Sustained wind | `>=20 km/h` | Sand/discomfort warning |
| Wind gust      | `>=30 km/h` | Sand/discomfort warning |
| Sustained wind | `>=35 km/h` | Red: strong wind        |
| Wind gust      | `>=50 km/h` | Red: strong gusts       |

### 10.3 Default exposure thresholds

| Metric           | Initial rule                    | State                          |
| ---------------- | ------------------------------- | ------------------------------ |
| UV               | `>=6`                           | Strong exposure warning        |
| Direct radiation | `>=500 W/m²` during 11:00–15:00 | Direct midday exposure warning |

All thresholds in sections 10 and 11 are user-configurable from the Config view. The default wind values remain configurable because blowing sand depends on grain size, moisture, and beach conditions. The warning value is informed by the Beaufort 4 range in which dust and loose material begin to lift, not by a Sandbridge-specific sand study. See the [NWS Beaufort scale](https://www.weather.gov/crp/BeaufortScale).

The default warm-water state is an alert above `24°C`. It must not be described as a general medical or surf hazard.

## 11. Late-day swim windows

Generate candidate windows from local hourly records:

1. Consider hours from the approved `15:00` start through local sunset.
2. Build consecutive two-hour windows.
3. Require complete wave, period, water, wind, and exposure inputs.
4. Reject any window containing a red marine or wind state.
5. Require every hour to be below the wind warning thresholds.
6. Require at least one lower-exposure signal per hour:
   - UV index `<=3`, or
   - direct radiation `<=200 W/m²`, or
   - cloud cover `>=70%`.
7. Prefer the longest passing sequence, then the earlier start.

Display the actual values that caused a window to qualify. Do not reduce the result to an unexplained score.

If no window qualifies, say “No late-day window matches all configured comfort rules.”

## 12. Extended swimming cards

For each local day:

- Show the best qualifying block, if any.
- Use the sea-surface temperature at the start or midpoint of that block.
- Show the maximum wave height and maximum wind speed inside the block.
- If no block qualifies, show the day’s late-afternoon range without a highlight.
- Do not use all-day means to represent late-day conditions.

## 13. Fishing signals

### 13.1 Tide range

For each adjacent low/high pair:

```text
tideRangeM = abs(highHeightM - lowHeightM)
```

Show the range as descriptive context, not a universal activity score.

### 13.2 Stronger estimated movement

The cosine tide curve changes fastest near the midpoint between adjacent extrema. Highlight a window centered on that midpoint:

- Default candidate: midpoint `±60 minutes`
- Exclude the event’s near-slack band
- Attach expected tide direction: incoming or outgoing
- Show wind and pressure values during the candidate

Describe this as “stronger estimated tidal movement.”

#### 13.2.1 Movement strength grading

The derivative of the cosine curve peaks at the midpoint with:

```text
peakRateMPerH = π × tideRangeM / (2 × durationHours)
```

| Estimated peak rate | Strength |
| ------------------- | -------- |
| `>= 0.28 m/h`       | Strong   |
| `>= 0.18 m/h`       | Moderate |
| Below               | Weak     |

The thresholds bracket the typical Sandbridge mean range (about 1 m over ~6.2 h ≈ 0.25 m/h) so springs grade strong and neaps grade weak. Display the rate with the grade; the grade is informational and never changes candidacy.

#### 13.2.2 Informational context attached to movement windows

Each movement window also carries, when the source data exists:

- Dawn/dusk overlap: the window overlaps sunrise or sunset `±60 minutes` (Open-Meteo solar days).
- Shore-relative wind: wind-from direction within `45°` of the shore-facing bearing (`90°`, east) is onshore, `135°` or more away is offshore, otherwise alongshore.
- Modeled wave height: closest Open-Meteo Marine hour within `90 minutes` of the midpoint. A stale marine feed is named with its age in the outlook's stale notice; because wave lines are informational, stale marine data does not demote a candidate the way stale tide or weather data does.
- Solunar overlap: see 13.5.

Every field is null when its input is unavailable, and none of them affects candidate status (13.4).

### 13.3 Wind shifts

Calculate the smallest circular direction difference. A proposed material shift is:

```text
direction change >= 45° within 6 hours
```

Only flag a shift when both endpoints have meaningful wind speed, proposed as `>=8 km/h`; direction is noisy and less useful in calm conditions.

### 13.4 Candidate fishing windows

A generic candidate window:

- Falls within stronger estimated tidal movement
- Has sustained wind below the configured strong-wind threshold
- Does not overlap an official severe weather or surf alert
- Includes its tide direction, wind, gust, and pressure tendency

Candidate status is intentionally broad. A separate “candidate focus” presentation may surface a smaller set of candidates when all of these are true:

- The window already passes the generic candidate gate.
- Estimated movement is moderate or strong.
- Sustained wind and gust are both below the configured warning thresholds, not just below the strong-wind gate.
- The window either has strong estimated movement or has at least one extra timing/context signal, such as a major solunar overlap or dawn/dusk overlap.

Focused candidates are listed chronologically and limited to the configured count. They are not a universal score, do not hide the full tide timeline, and do not change candidate status.

Do not rank one universal “best” time until target species, season, and fishing method are defined.

### 13.5 Derived lunar context

Moon values are computed locally from a low-precision lunar ephemeris (truncated Meeus series, direction accuracy within a fraction of a degree, derived instants within a few minutes). Label them as derived estimates; they are never an official product.

- Daily moon phase: phase name (eight 45° sectors of sun–moon elongation) and illuminated percentage, evaluated once per local day.
- Solunar majors: `±60 minutes` around each lunar transit (moon overhead or underfoot).
- Solunar minors: `±30 minutes` around moonrise and moonset, using an effective horizon altitude of `+0.125°` (mean parallax minus refraction).

A movement window that overlaps a major reports `major`; otherwise an overlapping minor reports `minor`. Solunar overlap is informational only and never changes candidate status.

## 14. Rule precedence

Highest priority wins:

1. Official active hazard or beach advisory
2. Missing or stale data warning
3. Red marine/wind rule
4. Cold, warm, sand, or exposure warning
5. Matching comfort/fishing window
6. Neutral information

A favorable derived state must never visually suppress an official warning.

## 15. Attribution

The application footer or source drawer must provide clear attribution and links for:

- Open-Meteo
- The underlying marine model attribution required by Open-Meteo
- NOAA/NOS/CO-OPS
- National Weather Service when its data is displayed
- Virginia Department of Health when linking advisory status

Review provider terms immediately before public deployment because free-tier limits and required wording can change.
