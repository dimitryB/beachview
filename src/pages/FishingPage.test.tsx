import { render, screen } from "@testing-library/react";

import { parseNoaaTidesResponse } from "@/data/noaa-tides";
import { parseWeatherResponse } from "@/data/open-meteo-weather";
import { FishingPage } from "@/pages/FishingPage";
import {
  FETCHED_AT,
  NOAA_RESPONSE,
  WEATHER_RESPONSE,
} from "@/test/fixtures/providers";
import type { BeachDataState } from "@/types/domain";

const parsedWeather = parseWeatherResponse(WEATHER_RESPONSE, FETCHED_AT);
const weather = {
  ...parsedWeather,
  hourly: [
    {
      ...parsedWeather.hourly[0]!,
      validAt: "2026-07-02T19:00:00.000Z",
      pressureHpa: 1016,
    },
    ...parsedWeather.hourly,
  ],
};
const tides = parseNoaaTidesResponse(
  NOAA_RESPONSE,
  FETCHED_AT,
  new Date("2026-07-02T16:00:00.000Z"),
);

const data: BeachDataState = {
  weather: {
    status: "fresh",
    data: weather,
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
  },
  marine: {
    status: "loading",
    data: null,
    error: null,
    fetchedAt: null,
    isRefreshing: false,
  },
  tides: {
    status: "fresh",
    data: tides,
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
  },
};

describe("FishingPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows predicted tide phase, pressure tendency, and modeled wind", () => {
    const { container } = render(
      <FishingPage
        data={data}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(screen.getByText("Incoming", { exact: true })).toBeVisible();
    expect(
      screen.getByText("Rising +1.5 hPa / 3 h", { exact: true }),
    ).toBeVisible();
    // The tide phase card and the tide chart summary both mention the next
    // predicted high, so at least one match is required rather than exactly one.
    expect(screen.getAllByText(/Next predicted high/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Wind from S \(173°\)/)).toBeVisible();
    expect(container).not.toHaveTextContent("Below wind warning");
    expect(container).not.toHaveTextContent("safe");
  });

  it("renders the tide chart section in place of the placeholder", () => {
    render(
      <FishingPage
        data={data}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Today and tomorrow at Sandbridge",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("NOAA predicted tide events for Sandbridge"),
    ).toBeInTheDocument();
  });

  it("renders the fishing outlook timeline with movement periods", () => {
    render(
      <FishingPage
        data={data}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Fishing timeline" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Stronger estimated/).length).toBeGreaterThan(0);
    // The 7:03 PM UTC movement midpoint sits within tolerance of the injected
    // 7 PM weather hour, whose calm modeled wind makes it a candidate.
    expect(screen.getByText(/Candidate period/)).toBeInTheDocument();
  });
});
