import { fireEvent, render, screen, within } from "@testing-library/react";

import { FishingOutlook } from "@/components/forecast/FishingOutlook";
import type {
  CurrentWeather,
  DataPoint,
  DataSource,
  OfficialAlert,
  ProviderState,
  TideDataset,
  TideEvent,
  TideEventType,
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
    windDirectionDeg: point(225, source),
    windGustKmh: point(18, source),
    pressureHpa: point(1015, source),
    cloudCoverPct: point(40, source),
    isDay: point(true, source),
  };
}

function weatherHour(
  validAt: string,
  overrides: Partial<WeatherForecastHour> = {},
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 26,
    windSpeedKmh: 12,
    windDirectionDeg: 225,
    windGustKmh: 18,
    pressureHpa: 1016,
    cloudCoverPct: 30,
    directRadiationWm2: 150,
    uvIndex: 2,
    ...overrides,
  };
}

function weatherDataset(hourly: WeatherForecastHour[]): WeatherDataset {
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
    solarDays: [],
  };
}

function tideEvent(
  type: TideEventType,
  validAt: string,
  localDate: string,
  heightM: number,
): TideEvent {
  return {
    id: `${validAt}-${type}`,
    type,
    validAt,
    localDate,
    heightM,
    datum: "MLLW",
    source: "noaa-tides",
    kind: "predicted",
  };
}

function tideDataset(events: TideEvent[]): TideDataset {
  return {
    source: "noaa-tides",
    fetchedAt: FETCHED_AT,
    stationId: "8639428",
    stationName: "Sandbridge",
    datum: "MLLW",
    events,
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

// Local day 2026-07-02 (EDT = UTC-4): low 7:00 AM, high 1:00 PM, low 7:00 PM.
// The incoming movement window (9:00–11:00 AM) has calm SW wind and a rising
// pressure comparison, so it is a candidate. The outgoing window
// (3:00–5:00 PM) overlaps the fixture alert, so the domain flags it as a
// non-candidate. A SW → E wind shift lands at 5:00 PM. Local day 2026-07-03
// has a wind shift but no tide events, so it renders as incomplete.
const fixtureEvents = [
  tideEvent("low", "2026-07-02T11:00:00.000Z", "2026-07-02", 0.08),
  tideEvent("high", "2026-07-02T17:00:00.000Z", "2026-07-02", 1.0),
  tideEvent("low", "2026-07-02T23:00:00.000Z", "2026-07-02", 0.1),
];

const fixtureWeatherHours = [
  weatherHour("2026-07-02T11:00:00.000Z", { pressureHpa: 1014 }),
  weatherHour("2026-07-02T14:00:00.000Z"),
  weatherHour("2026-07-02T18:00:00.000Z", {
    windSpeedKmh: 14,
    windGustKmh: 20,
  }),
  weatherHour("2026-07-02T21:00:00.000Z", {
    windSpeedKmh: 14,
    windGustKmh: 20,
    windDirectionDeg: 90,
  }),
  weatherHour("2026-07-03T15:00:00.000Z", {
    windSpeedKmh: 14,
    windDirectionDeg: 90,
  }),
  weatherHour("2026-07-03T18:00:00.000Z", {
    windSpeedKmh: 14,
    windDirectionDeg: 180,
  }),
];

const fixtureAlert: OfficialAlert = {
  id: "alert-1",
  headline: "Coastal Flood Advisory",
  severity: "Moderate",
  effectiveAt: "2026-07-02T19:30:00.000Z",
  expiresAt: "2026-07-02T20:30:00.000Z",
  sourceUrl: "https://alerts.weather.gov/example",
  source: "nws-alerts",
  kind: "official-alert",
};

interface RenderOptions {
  alerts?: readonly OfficialAlert[];
  onRetryTides?: () => void;
  onRetryWeather?: () => void;
}

function renderOutlook(
  tides: ProviderState<TideDataset>,
  weather: ProviderState<WeatherDataset>,
  {
    alerts = [fixtureAlert],
    onRetryTides = vi.fn(),
    onRetryWeather = vi.fn(),
  }: RenderOptions = {},
) {
  return render(
    <FishingOutlook
      alerts={alerts}
      onRetryTides={onRetryTides}
      onRetryWeather={onRetryWeather}
      tides={tides}
      weather={weather}
    />,
  );
}

function renderFixtureOutlook(options: RenderOptions = {}) {
  return renderOutlook(
    providerState(tideDataset(fixtureEvents)),
    providerState(weatherDataset(fixtureWeatherHours)),
    options,
  );
}

function dayGroup(headingName: string): HTMLElement {
  const group = screen
    .getByRole("heading", { level: 3, name: headingName })
    .closest("li");
  if (!group) {
    throw new Error(`No day group found for heading "${headingName}"`);
  }
  return group;
}

describe("FishingOutlook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Noon EDT on 2026-07-02, so the first fixture day is labeled "Today".
    vi.setSystemTime(new Date("2026-07-02T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists predicted events, movement periods, and shifts chronologically", () => {
    renderFixtureOutlook();

    const today = dayGroup("Today");
    expect(
      within(today).getByText("Largest predicted tide range 0.92 m"),
    ).toBeInTheDocument();

    // Collapse whitespace so ICU narrow no-break spaces in formatted times
    // compare like plain spaces.
    const entries = [
      ...today.querySelectorAll(".fishing-day__timeline > li"),
    ].map((entry) => (entry.textContent ?? "").replace(/\s+/g, " "));
    expect(entries).toHaveLength(6);
    expect(entries[0]).toContain("7:00 AM");
    expect(entries[0]).toContain("Predicted low tide");
    expect(entries[0]).toContain("0.08 m MLLW");
    expect(entries[1]).toContain("Stronger estimated incoming movement");
    expect(entries[2]).toContain("Predicted high tide");
    expect(entries[2]).toContain("1.00 m MLLW");
    expect(entries[3]).toContain("Stronger estimated outgoing movement");
    expect(entries[4]).toContain("Wind shifts SW → E");
    expect(entries[5]).toContain("7:00 PM");
    expect(entries[5]).toContain("0.10 m MLLW");
  });

  it("shows the candidate period with its attached reasoning", () => {
    renderFixtureOutlook();

    const entry = screen.getByText(/Candidate period/).closest("li");
    if (!entry) {
      throw new Error("No candidate timeline entry found");
    }
    expect(entry).toHaveClass("fishing-entry--candidate");
    expect(
      within(entry).getByText("Stronger estimated incoming movement"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("9:00 AM – 11:00 AM Eastern"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("Wind 12 km/h from SW · gust 18 km/h"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("Pressure: Rising +2.0 hPa / 3 h"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("Predicted tide range 0.92 m"),
    ).toBeInTheDocument();
  });

  it("renders an alert-overlapping period as informational, not a candidate", () => {
    renderFixtureOutlook();

    const entry = screen.getByText(/Not a candidate/).closest("li");
    if (!entry) {
      throw new Error("No non-candidate timeline entry found");
    }
    expect(entry).not.toHaveClass("fishing-entry--candidate");
    expect(
      within(entry).getByText("Stronger estimated outgoing movement"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("3:00 PM – 5:00 PM Eastern"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText(
        /An official alert is active during this window \(Coastal Flood Advisory\), so it is not a candidate/,
      ),
    ).toBeInTheDocument();
  });

  it("labels material wind shifts with their from and to directions", () => {
    renderFixtureOutlook();

    const today = dayGroup("Today");
    expect(within(today).getByText("Wind shifts SW → E")).toBeInTheDocument();
    expect(
      within(today).getByText("Wind shifts from SW to E"),
    ).toBeInTheDocument();
    expect(
      within(today).getByText("Modeled 135° direction change"),
    ).toBeInTheDocument();
  });

  it("marks a day without tide coverage while keeping its wind shift", () => {
    renderFixtureOutlook();

    const day = dayGroup("Fri 7/3");
    expect(
      within(day).getByText(/Tide predictions do not cover this date/),
    ).toBeInTheDocument();
    expect(within(day).getByText("Wind shifts E → S")).toBeInTheDocument();
    expect(within(day).queryByText(/Predicted high tide/)).toBeNull();
    expect(within(day).queryByText(/Largest predicted tide range/)).toBeNull();
  });

  it("avoids safety, observation, score, and marine-comfort claims", () => {
    const { container } = renderFixtureOutlook();
    const text = (container.textContent ?? "").toLowerCase();

    for (const banned of [
      "safe",
      "observed",
      "guarantee",
      "fish score",
      "wave",
      "swim",
    ]) {
      expect(text).not.toContain(banned);
    }
  });

  it("shows dimension-matched skeletons while feeds load", () => {
    const { container } = renderOutlook(
      providerState<TideDataset>(null, { status: "loading" }),
      providerState<WeatherDataset>(null, { status: "loading" }),
    );

    expect(
      screen.getByText("Loading the fishing timeline."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".fishing-day--skeleton")).toHaveLength(
      3,
    );
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("names missing tide predictions and offers an isolated tide retry", () => {
    const onRetryTides = vi.fn();
    renderOutlook(
      providerState<TideDataset>(null, {
        status: "error",
        error: "NOAA provider unavailable.",
      }),
      providerState(weatherDataset(fixtureWeatherHours)),
      { onRetryTides },
    );

    expect(
      screen.getByText(
        "NOAA tide predictions are unavailable, so the fishing timeline cannot be derived yet.",
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry tides" }));
    expect(onRetryTides).toHaveBeenCalledOnce();
  });

  it("demotes candidates and names the feed when weather data is stale", () => {
    renderOutlook(
      providerState(tideDataset(fixtureEvents)),
      providerState(weatherDataset(fixtureWeatherHours), {
        status: "stale",
        // 48 minutes before the fake system time of 4:00 PM UTC.
        fetchedAt: "2026-07-02T15:12:00.000Z",
      }),
    );

    expect(
      screen.getByText(/Showing weather updated 48 min ago/),
    ).toBeVisible();
    expect(
      screen.getByText(/derived from stale data and may be outdated/),
    ).toBeVisible();
    expect(screen.queryByText(/Candidate period/)).toBeNull();

    const entry = screen.getByText(/Based on stale data/).closest("li");
    if (!entry) {
      throw new Error("No stale-demoted timeline entry found");
    }
    expect(entry).toHaveClass("fishing-entry--stale-candidate");
    expect(entry).not.toHaveClass("fishing-entry--candidate");
    // The derived period and its reasoning remain listed.
    expect(
      within(entry).getByText("9:00 AM – 11:00 AM Eastern"),
    ).toBeInTheDocument();
    expect(
      within(entry).getByText("Pressure: Rising +2.0 hPa / 3 h"),
    ).toBeInTheDocument();
  });

  it("demotes candidates and names the feed when tide data is stale", () => {
    renderOutlook(
      providerState(tideDataset(fixtureEvents), {
        status: "stale",
        fetchedAt: "2026-07-02T15:12:00.000Z",
      }),
      providerState(weatherDataset(fixtureWeatherHours)),
    );

    expect(
      screen.getByText(/Showing tide predictions updated 48 min ago/),
    ).toBeVisible();
    expect(screen.queryByText(/Candidate period/)).toBeNull();
    expect(screen.getByText(/Based on stale data/)).toBeVisible();
  });

  it("keeps the tide timeline with a weather notice when weather is missing", () => {
    const onRetryWeather = vi.fn();
    renderOutlook(
      providerState(tideDataset(fixtureEvents)),
      providerState<WeatherDataset>(null, {
        status: "error",
        error: "Weather provider unavailable.",
      }),
      { onRetryWeather },
    );

    expect(dayGroup("Today")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The modeled weather forecast is unavailable, so wind, gust, and pressure reasoning is missing/,
      ),
    ).toBeVisible();
    expect(screen.queryByText(/Candidate period/)).toBeNull();
    expect(screen.getAllByText("Modeled wind unavailable")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry weather" }));
    expect(onRetryWeather).toHaveBeenCalledOnce();
  });
});
