import { render, screen } from "@testing-library/react";

import { DataUpdateAnnouncer } from "@/components/conditions/DataUpdateAnnouncer";
import type { BeachDataState, ProviderState } from "@/types/domain";

const loadingState: ProviderState<never> = {
  status: "loading",
  data: null,
  error: null,
  fetchedAt: null,
  isRefreshing: false,
};

function loadingData(): BeachDataState {
  return {
    weather: loadingState,
    marine: loadingState,
    tides: loadingState,
  };
}

describe("DataUpdateAnnouncer", () => {
  it("announces provider completions once without announcing initial loading", () => {
    const initial = loadingData();
    const { rerender } = render(<DataUpdateAnnouncer data={initial} />);
    const liveRegion = screen.getByRole("status");

    expect(liveRegion).toHaveTextContent("");

    rerender(
      <DataUpdateAnnouncer
        data={{
          ...initial,
          weather: {
            ...initial.weather,
            status: "fresh",
            fetchedAt: "2026-07-03T15:00:00.000Z",
          },
          marine: {
            ...initial.marine,
            status: "fresh",
            fetchedAt: "2026-07-03T15:00:00.000Z",
          },
        }}
      />,
    );

    expect(liveRegion).toHaveTextContent(
      "Weather data updated. Marine data updated.",
    );
  });

  it("announces a completed manual refresh when status remains fresh", () => {
    const fresh: BeachDataState = {
      weather: {
        ...loadingState,
        status: "fresh",
        fetchedAt: "2026-07-03T15:00:00.000Z",
      },
      marine: loadingState,
      tides: loadingState,
    };
    const { rerender } = render(<DataUpdateAnnouncer data={fresh} />);

    rerender(
      <DataUpdateAnnouncer
        data={{
          ...fresh,
          weather: { ...fresh.weather, isRefreshing: true },
        }}
      />,
    );
    rerender(
      <DataUpdateAnnouncer
        data={{
          ...fresh,
          weather: {
            ...fresh.weather,
            fetchedAt: "2026-07-03T15:15:00.000Z",
          },
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Weather data updated.",
    );
  });
});
