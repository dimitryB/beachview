import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SourceDetails } from "@/components/layout/SourceDetails";
import { parseNoaaTidesResponse } from "@/data/noaa-tides";
import { parseMarineResponse } from "@/data/open-meteo-marine";
import { parseWeatherResponse } from "@/data/open-meteo-weather";
import {
  FETCHED_AT,
  MARINE_RESPONSE,
  NOAA_RESPONSE,
  WEATHER_RESPONSE,
} from "@/test/fixtures/providers";
import type { BeachDataState } from "@/types/domain";

const data: BeachDataState = {
  weather: {
    status: "fresh",
    data: parseWeatherResponse(WEATHER_RESPONSE, FETCHED_AT),
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
  },
  marine: {
    status: "fresh",
    data: parseMarineResponse(MARINE_RESPONSE, FETCHED_AT),
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
  },
  tides: {
    status: "fresh",
    data: parseNoaaTidesResponse(
      NOAA_RESPONSE,
      FETCHED_AT,
      new Date("2026-07-02T16:00:00.000Z"),
    ),
    error: null,
    fetchedAt: FETCHED_AT,
    isRefreshing: false,
  },
};

describe("SourceDetails", () => {
  it("exposes modeled, predicted, grid, station, datum, and attribution details", async () => {
    const user = userEvent.setup();
    render(<SourceDetails data={data} />);

    expect(screen.getByText("Modeled forecast")).toBeVisible();
    expect(screen.getByText("Modeled offshore grid")).toBeVisible();
    expect(screen.getByText("Predicted high/low tides")).toBeVisible();

    await user.click(screen.getByText("Open-Meteo Marine"));
    await user.click(screen.getAllByText("NOAA CO-OPS")[0]!);

    // The requested point renders in both the weather and marine cards, so
    // scope the query to the expanded marine card.
    const marineCard = screen.getByText("Open-Meteo Marine").closest("details");
    expect(marineCard).not.toBeNull();
    expect(within(marineCard!).getByText("36.7083, -75.8750")).toBeVisible();
    expect(screen.getByText("Sandbridge (8639428)")).toBeVisible();
    expect(screen.getByText(/MLLW · Mean Lower Low Water/)).toBeVisible();
    expect(screen.getByText(/CC BY 4.0/)).toBeVisible();
  });

  it("never describes modeled values as on-site observations", async () => {
    const user = userEvent.setup();
    const { container } = render(<SourceDetails data={data} />);

    await user.click(screen.getByText("Open-Meteo Marine"));

    expect(container).toHaveTextContent("not an on-beach observation");
    expect(container).toHaveTextContent("VABeachCast estimates");
  });
});
