import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { parseMarineResponse } from "@/data/open-meteo-marine";
import { parseWeatherResponse } from "@/data/open-meteo-weather";
import { SwimmingPage } from "@/pages/SwimmingPage";
import {
  FETCHED_AT,
  MARINE_RESPONSE,
  WEATHER_RESPONSE,
} from "@/test/fixtures/providers";
import type { BeachDataState } from "@/types/domain";

const weather = parseWeatherResponse(WEATHER_RESPONSE, FETCHED_AT);
const marine = parseMarineResponse(MARINE_RESPONSE, FETCHED_AT);

function baseState(): BeachDataState {
  return {
    weather: {
      status: "fresh",
      data: weather,
      error: null,
      fetchedAt: FETCHED_AT,
      isRefreshing: false,
    },
    marine: {
      status: "fresh",
      data: marine,
      error: null,
      fetchedAt: FETCHED_AT,
      isRefreshing: false,
    },
    tides: {
      status: "loading",
      data: null,
      error: null,
      fetchedAt: null,
      isRefreshing: true,
    },
  };
}

describe("SwimmingPage", () => {
  it("presents current semantic flags, modeled source times, and no safety claim", () => {
    const { container } = render(
      <SwimmingPage
        data={baseState()}
        onRetryMarine={vi.fn()}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(screen.getByText("2 configured comfort flags")).toBeVisible();
    expect(screen.getByText("Warm-water alert", { exact: true })).toBeVisible();
    expect(screen.getByText("Choppy", { exact: true })).toBeVisible();
    expect(
      screen.getByText("Moderate exposure", { exact: true }),
    ).toBeVisible();
    expect(
      screen.getAllByText(/Open-Meteo Marine modeled · valid/),
    ).not.toHaveLength(0);
    expect(container.textContent?.toLowerCase()).not.toContain("safe to swim");
    expect(container.textContent?.toLowerCase()).not.toContain(
      "no rip-current risk",
    );
  });

  it("renders the ten-day outlook and predicted tide chart sections", async () => {
    render(
      <SwimmingPage
        data={baseState()}
        onRetryMarine={vi.fn()}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Late-day swim windows" }),
    ).toBeVisible();
    // Fixture day one has a complete late-day hour but no qualifying window;
    // day two has no late-day hours at all.
    expect(screen.getByText("No complete match")).toBeVisible();
    expect(
      screen.getByText(/Forecast data is incomplete for this day/),
    ).toBeVisible();
    expect(screen.queryByText(/forecast cards land in Phase 4/)).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Today and tomorrow at Sandbridge" }),
    ).toBeVisible();
    expect(
      screen.getByText("Loading NOAA high and low predictions."),
    ).toBeVisible();
  });

  it("labels readiness as cached when a provider is stale", () => {
    const state = baseState();
    state.weather = { ...state.weather, status: "stale" };

    render(
      <SwimmingPage
        data={state}
        onRetryMarine={vi.fn()}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(screen.getByText("Using cached current conditions")).toBeVisible();
  });

  it("keeps weather visible and offers an isolated marine retry", async () => {
    const onRetryMarine = vi.fn();
    const state = baseState();
    state.marine = {
      status: "error",
      data: null,
      error: "Marine provider unavailable.",
      fetchedAt: null,
      isRefreshing: false,
    };
    const user = userEvent.setup();

    render(
      <SwimmingPage
        data={state}
        onRetryMarine={onRetryMarine}
        onRetryTides={vi.fn()}
        onRetryWeather={vi.fn()}
      />,
    );

    expect(screen.getByText("31.8")).toBeVisible();
    expect(
      screen.getByText("Current comfort data is incomplete"),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "marine data is unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryMarine).toHaveBeenCalledOnce();
  });
});
