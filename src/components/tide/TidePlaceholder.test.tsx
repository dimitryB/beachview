import { act, render, screen } from "@testing-library/react";

import { TidePlaceholder } from "@/components/tide/TidePlaceholder";
import type { ProviderState, TideDataset, TideEvent } from "@/types/domain";

function tideEvent(
  id: string,
  type: "high" | "low",
  validAt: string,
  heightM: number,
): TideEvent {
  return {
    id,
    type,
    validAt,
    localDate: "2026-07-02",
    heightM,
    datum: "MLLW",
    source: "noaa-tides",
    kind: "predicted",
  };
}

const tides: ProviderState<TideDataset> = {
  status: "stale",
  fetchedAt: "2026-07-02T12:00:00.000Z",
  error: null,
  isRefreshing: false,
  data: {
    source: "noaa-tides",
    fetchedAt: "2026-07-02T12:00:00.000Z",
    stationId: "8639428",
    stationName: "Sandbridge",
    datum: "MLLW",
    events: [
      tideEvent("past", "low", "2026-07-02T17:00:00.000Z", 0.12),
      tideEvent("soon", "high", "2026-07-02T18:00:30.000Z", 1.11),
      tideEvent("later", "low", "2026-07-02T20:00:00.000Z", 0.24),
    ],
  },
};

describe("TidePlaceholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters events against the live clock rather than fetchedAt", () => {
    render(<TidePlaceholder tides={tides} />);

    expect(screen.queryByText("0.12 m")).not.toBeInTheDocument();
    expect(screen.getByText("1.11 m")).toBeInTheDocument();
    expect(screen.getByText("0.24 m")).toBeInTheDocument();
  });

  it("removes an event after it passes while the app remains open", () => {
    render(<TidePlaceholder tides={tides} />);
    expect(screen.getByText("1.11 m")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60 * 1_000);
    });

    expect(screen.queryByText("1.11 m")).not.toBeInTheDocument();
    expect(screen.getByText("0.24 m")).toBeInTheDocument();
  });
});
