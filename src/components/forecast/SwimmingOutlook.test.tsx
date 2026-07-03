import { fireEvent, render, screen, within } from "@testing-library/react";

import { SwimmingOutlook } from "@/components/forecast/SwimmingOutlook";
import type {
  CurrentMarine,
  CurrentWeather,
  DataPoint,
  DataSource,
  MarineDataset,
  MarineForecastHour,
  ProviderState,
  SolarDay,
  WeatherDataset,
  WeatherForecastHour,
} from "@/types/domain";

const FETCHED_AT = "2026-07-02T16:00:00.000Z";

function point<T>(value: T, source: DataSource): DataPoint<T> {
  return {
    value,
    validAt: FETCHED_AT,
    fetchedAt: FETCHED_AT,
    source,
    kind: "modeled",
  };
}

function currentWeather(): CurrentWeather {
  const source: DataSource = "open-meteo-weather";
  return {
    airTemperatureC: point(26, source),
    windSpeedKmh: point(12, source),
    windDirectionDeg: point(180, source),
    windGustKmh: point(18, source),
    pressureHpa: point(1015, source),
    cloudCoverPct: point(40, source),
    isDay: point(true, source),
  };
}

function currentMarine(): CurrentMarine {
  const source: DataSource = "open-meteo-marine";
  return {
    waveHeightM: point(0.5, source),
    wavePeriodS: point(8, source),
    seaSurfaceTemperatureC: point(25, source),
  };
}

function weatherHour(
  validAt: string,
  overrides: Partial<WeatherForecastHour> = {},
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 26,
    windSpeedKmh: 14,
    windDirectionDeg: 180,
    windGustKmh: 24,
    pressureHpa: 1015,
    cloudCoverPct: 30,
    directRadiationWm2: 150,
    uvIndex: 2,
    ...overrides,
  };
}

function marineHour(
  validAt: string,
  overrides: Partial<MarineForecastHour> = {},
): MarineForecastHour {
  return {
    validAt,
    waveHeightM: 0.5,
    wavePeriodS: 8,
    seaSurfaceTemperatureC: 25,
    ...overrides,
  };
}

function solarDay(providerDate: string, sunsetAt: string): SolarDay {
  return { providerDate, sunriseAt: null, sunsetAt };
}

function weatherDataset(
  hourly: WeatherForecastHour[],
  solarDays: SolarDay[],
): WeatherDataset {
  return {
    source: "open-meteo-weather",
    fetchedAt: FETCHED_AT,
    grid: {
      requestedLatitude: 36.6917,
      requestedLongitude: -75.92,
      returnedLatitude: 36.6917,
      returnedLongitude: -75.92,
    },
    current: currentWeather(),
    hourly,
    solarDays,
  };
}

function marineDataset(hourly: MarineForecastHour[]): MarineDataset {
  return {
    source: "open-meteo-marine",
    fetchedAt: FETCHED_AT,
    grid: {
      requestedLatitude: 36.6917,
      requestedLongitude: -75.92,
      returnedLatitude: 36.6917,
      returnedLongitude: -75.92,
    },
    current: currentMarine(),
    hourly,
  };
}

function providerState<T>(
  data: T | null,
  overrides: Partial<ProviderState<T>> = {},
): ProviderState<T> {
  return {
    status: "fresh",
    data,
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
    ...overrides,
  };
}

// Local day 2026-07-02: three qualifying hours (3–5 PM EDT), so the derived
// window runs 3:00–6:00 PM Eastern. Local day 2026-07-03: complete hours but
// wind at the warning threshold, so no match. Local day 2026-07-04: a wave
// height gap makes every late-day hour incomplete.
const matchTimes = [
  "2026-07-02T19:00:00.000Z",
  "2026-07-02T20:00:00.000Z",
  "2026-07-02T21:00:00.000Z",
];
const noMatchTimes = [
  "2026-07-03T19:00:00.000Z",
  "2026-07-03T20:00:00.000Z",
  "2026-07-03T21:00:00.000Z",
];
const incompleteTimes = [
  "2026-07-04T19:00:00.000Z",
  "2026-07-04T20:00:00.000Z",
];

const fixtureWeatherHours = [
  ...matchTimes.map((time) => weatherHour(time)),
  ...noMatchTimes.map((time) => weatherHour(time, { windSpeedKmh: 20 })),
  ...incompleteTimes.map((time) => weatherHour(time)),
];
const fixtureMarineHours = [
  ...matchTimes.map((time) => marineHour(time)),
  ...noMatchTimes.map((time) => marineHour(time)),
  ...incompleteTimes.map((time) => marineHour(time, { waveHeightM: null })),
];
const fixtureSolarDays = [
  solarDay("2026-07-03", "2026-07-03T00:30:00.000Z"),
  solarDay("2026-07-04", "2026-07-04T00:30:00.000Z"),
  solarDay("2026-07-05", "2026-07-05T00:30:00.000Z"),
];

function renderOutlook(
  weather: ProviderState<WeatherDataset>,
  marine: ProviderState<MarineDataset>,
  onRetryMarine = vi.fn(),
  onRetryWeather = vi.fn(),
) {
  return render(
    <SwimmingOutlook
      marine={marine}
      onRetryMarine={onRetryMarine}
      onRetryWeather={onRetryWeather}
      weather={weather}
    />,
  );
}

function renderFixtureOutlook() {
  return renderOutlook(
    providerState(weatherDataset(fixtureWeatherHours, fixtureSolarDays)),
    providerState(marineDataset(fixtureMarineHours)),
  );
}

function dayCard(headingName: string): HTMLElement {
  const card = screen
    .getByRole("heading", { level: 3, name: headingName })
    .closest("li");
  if (!card) {
    throw new Error(`No day card found for heading "${headingName}"`);
  }
  return card;
}

describe("SwimmingOutlook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Noon EDT on 2026-07-02, so the first fixture day is labeled "Today".
    vi.setSystemTime(new Date("2026-07-02T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("highlights a matching day with its Eastern window and reason chips", () => {
    renderFixtureOutlook();

    const card = dayCard("Today");
    expect(card).toHaveClass("swim-day--match");
    expect(within(card).getByText(/Matches preferences/)).toBeInTheDocument();
    expect(
      within(card).getByText("3:00 PM – 6:00 PM Eastern"),
    ).toBeInTheDocument();
    expect(within(card).getByText("UV 2.0 (≤3)")).toBeInTheDocument();
    expect(
      within(card).getByText("Direct radiation 150 W/m² (≤200)"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Warm-water alert")).toBeInTheDocument();
  });

  it("shows the no-match state with the configured-rules explanation", () => {
    renderFixtureOutlook();

    const card = dayCard("Fri 7/3");
    expect(within(card).getByText("No complete match")).toBeInTheDocument();
    expect(
      within(card).getByText(
        "No late-day window matches all configured comfort rules.",
      ),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/Matches preferences/)).toBeNull();
  });

  it("shows the incomplete state without a match when inputs are missing", () => {
    renderFixtureOutlook();

    const card = dayCard("Sat 7/4");
    expect(card).toHaveClass("swim-day--incomplete");
    expect(within(card).getByText(/Data incomplete/)).toBeInTheDocument();
    expect(
      within(card).getByText(/Forecast data is incomplete for this day/),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/Matches preferences/)).toBeNull();
    expect(within(card).queryByText("No complete match")).toBeNull();
  });

  it("renders only water, wave, and wind metrics on every card", () => {
    renderFixtureOutlook();

    for (const heading of ["Today", "Fri 7/3", "Sat 7/4"]) {
      const terms = within(dayCard(heading))
        .getAllByRole("term")
        .map((term) => term.textContent);
      expect(terms).toEqual(["Water", "Waves (max)", "Wind (max)"]);
    }
    expect(within(dayCard("Sat 7/4")).getByText("Unavailable")).toBeVisible();
  });

  it("caps the outlook at ten local days", () => {
    const manySolarDays = Array.from({ length: 12 }, (_, index) =>
      solarDay(
        `2026-07-${String(3 + index).padStart(2, "0")}`,
        new Date(Date.UTC(2026, 6, 3 + index, 0, 30)).toISOString(),
      ),
    );
    renderOutlook(
      providerState(weatherDataset(fixtureWeatherHours, manySolarDays)),
      providerState(marineDataset(fixtureMarineHours)),
    );

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(10);
  });

  it("avoids safety and observation claims", () => {
    const { container } = renderFixtureOutlook();
    const text = container.textContent?.toLowerCase() ?? "";

    expect(text).not.toContain("safe");
    expect(text).not.toContain("observed");
    expect(text).not.toContain("guarantee");
  });

  it("shows dimension-matched skeletons while forecasts load", () => {
    const { container } = renderOutlook(
      providerState<WeatherDataset>(null, { status: "loading" }),
      providerState<MarineDataset>(null, { status: "loading" }),
    );

    expect(
      screen.getByText("Loading the ten-day outlook."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".swim-day--skeleton")).toHaveLength(10);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("demotes matches and names the feed when weather data is stale", () => {
    renderOutlook(
      providerState(weatherDataset(fixtureWeatherHours, fixtureSolarDays), {
        status: "stale",
        // 48 minutes before the fake system time of 4:00 PM UTC.
        fetchedAt: "2026-07-02T15:12:00.000Z",
      }),
      providerState(marineDataset(fixtureMarineHours)),
    );

    expect(
      screen.getByText(/Showing weather updated 48 min ago/),
    ).toBeVisible();
    expect(
      screen.getByText(/derived from stale data and may be outdated/),
    ).toBeVisible();

    const card = dayCard("Today");
    expect(card).toHaveClass("swim-day--stale-match");
    expect(card).not.toHaveClass("swim-day--match");
    expect(screen.queryByText(/Matches preferences/)).toBeNull();
    expect(within(card).getByText(/Based on stale data/)).toBeVisible();
    // The derived window and its reasoning remain listed.
    expect(
      within(card).getByText("3:00 PM – 6:00 PM Eastern"),
    ).toBeInTheDocument();
    expect(within(card).getByText("UV 2.0 (≤3)")).toBeInTheDocument();
  });

  it("demotes matches and names the feed when marine data is stale", () => {
    renderOutlook(
      providerState(weatherDataset(fixtureWeatherHours, fixtureSolarDays)),
      providerState(marineDataset(fixtureMarineHours), {
        status: "stale",
        fetchedAt: "2026-07-02T15:12:00.000Z",
      }),
    );

    expect(
      screen.getByText(/Showing marine data updated 48 min ago/),
    ).toBeVisible();
    expect(screen.queryByText(/Matches preferences/)).toBeNull();
    expect(
      within(dayCard("Today")).getByText(/Based on stale data/),
    ).toBeVisible();
  });

  it("names the failed feed and offers an isolated retry", () => {
    const onRetryMarine = vi.fn();
    renderOutlook(
      providerState(weatherDataset(fixtureWeatherHours, fixtureSolarDays)),
      providerState<MarineDataset>(null, {
        status: "error",
        error: "Marine provider unavailable.",
      }),
      onRetryMarine,
    );

    expect(
      screen.getByText(
        "The modeled marine forecast is unavailable, so the ten-day outlook cannot be derived yet.",
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry marine" }));
    expect(onRetryMarine).toHaveBeenCalledOnce();
  });
});
