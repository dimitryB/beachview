import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { TideChart } from "@/components/tide/TideChart";
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

function providerState(
  overrides: Partial<ProviderState<TideDataset>>,
): ProviderState<TideDataset> {
  return {
    status: "fresh",
    data: null,
    error: null,
    fetchedAt: null,
    isRefreshing: false,
    ...overrides,
  };
}

const tides = providerState({
  status: "fresh",
  fetchedAt: "2026-07-02T17:00:00.000Z",
  data: {
    source: "noaa-tides",
    fetchedAt: "2026-07-02T17:00:00.000Z",
    stationId: "8639428",
    stationName: "Sandbridge",
    datum: "MLLW",
    events: [
      tideEvent("e1", "low", "2026-07-02T06:00:00.000Z", 0),
      tideEvent("e2", "high", "2026-07-02T12:00:00.000Z", 1.2),
      tideEvent("e3", "low", "2026-07-02T18:30:00.000Z", -0.2),
      tideEvent("e4", "high", "2026-07-03T00:30:00.000Z", 1),
      tideEvent("e5", "low", "2026-07-03T06:30:00.000Z", 0.1),
      tideEvent("e6", "high", "2026-07-03T12:30:00.000Z", 1.1),
      tideEvent("e7", "low", "2026-07-03T18:30:00.000Z", 0),
    ],
  },
});

describe("TideChart", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the estimated curve, shaped markers, and the now rule", () => {
    const { container } = render(<TideChart onRetry={vi.fn()} tides={tides} />);

    expect(
      screen.getByRole("img", {
        name: /estimated sandbridge beach tide height in meters above mllw/i,
      }),
    ).toBeInTheDocument();
    expect(container.querySelector(".tide-chart__line")).not.toBeNull();
    expect(container.querySelector(".tide-chart__area")).not.toBeNull();
    expect(container.querySelector(".tide-chart__now-rule")).not.toBeNull();
    expect(container.querySelector(".tide-chart__now-point")).not.toBeNull();
    expect(container.querySelectorAll(".tide-chart__marker")).toHaveLength(6);
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getAllByText(/▲ High/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/▼ Low/).length).toBeGreaterThan(0);
  });

  it("lists the charted events in a table with height and Eastern time", () => {
    render(<TideChart onRetry={vi.fn()} tides={tides} />);

    const table = screen.getByRole("table", {
      name: /noaa predicted tide events/i,
    });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(7);
    expect(within(rows[1]).getByText("1.20 m")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Thu 8:00 AM")).toBeInTheDocument();
    expect(within(rows[2]).getByText("-0.20 m")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Thu 2:30 PM")).toBeInTheDocument();
  });

  it("summarizes phase, estimated height, and the next predicted event", () => {
    render(<TideChart onRetry={vi.fn()} tides={tides} />);

    expect(
      screen.getByText(/Predicted phase: Near low slack\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Estimated -0\.18 m between NOAA high\/low predictions\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Next predicted low -0\.20 m at Thu 2:30 PM \(in 30 min\)\./,
      ),
    ).toBeInTheDocument();
  });

  it("moves the estimate forward as the clock ticks each minute", () => {
    render(<TideChart onRetry={vi.fn()} tides={tides} />);
    expect(screen.getByText(/Estimated -0\.18 m/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1_000);
    });

    expect(screen.getByText(/Estimated -0\.20 m/)).toBeInTheDocument();
  });

  it("drops a passed event and advances the summary while the app stays open", () => {
    render(<TideChart onRetry={vi.fn()} tides={tides} />);
    expect(screen.getByText(/Next predicted low -0\.20 m/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(31 * 60 * 1_000);
    });

    expect(
      screen.queryByText(/Next predicted low -0\.20 m/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Next predicted high 1\.00 m/)).toBeInTheDocument();
  });

  it("shows the loading state without a chart or table", () => {
    render(
      <TideChart
        onRetry={vi.fn()}
        tides={providerState({ status: "loading" })}
      />,
    );

    expect(
      screen.getByText("Loading NOAA high and low predictions."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the unavailable state and forwards retry clicks", () => {
    const onRetry = vi.fn();
    render(
      <TideChart
        onRetry={onRetry}
        tides={providerState({
          status: "error",
          error: "NOAA tide request failed.",
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "NOAA tide data is unavailable",
    );
    expect(
      screen.getAllByText("NOAA tide request failed.").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("never describes derived values as observed, live, or safe", () => {
    const { container } = render(<TideChart onRetry={vi.fn()} tides={tides} />);
    expect(container.textContent).not.toMatch(/\b(observed|live|safe)\b/i);
  });
});
