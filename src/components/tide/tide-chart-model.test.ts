import {
  buildTideChartModel,
  CHART_MARGINS,
  computeChartWindow,
  computeHeightDomain,
  createLinearScale,
  DEFAULT_CHART_SIZE,
  placeLabel,
  sampleCurvePoints,
} from "@/components/tide/tide-chart-model";
import { estimateTideHeight } from "@/domain/tide";
import type { TideEvent } from "@/types/domain";

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

const events = [
  tideEvent("e1", "low", "2026-07-02T06:00:00.000Z", 0),
  tideEvent("e2", "high", "2026-07-02T12:00:00.000Z", 1.2),
  tideEvent("e3", "low", "2026-07-02T18:30:00.000Z", -0.2),
  tideEvent("e4", "high", "2026-07-03T00:30:00.000Z", 1),
  tideEvent("e5", "low", "2026-07-03T06:30:00.000Z", 0.1),
  tideEvent("e6", "high", "2026-07-03T12:30:00.000Z", 1.1),
  tideEvent("e7", "low", "2026-07-03T18:30:00.000Z", 0),
];
const firstPair = [events[0], events[1]];
const nowMs = Date.parse("2026-07-02T18:00:00.000Z");

describe("createLinearScale", () => {
  it("maps a domain onto a pixel range, including inverted y ranges", () => {
    const x = createLinearScale(0, 10, 100, 200);
    expect(x(0)).toBe(100);
    expect(x(5)).toBe(150);
    expect(x(10)).toBe(200);

    const y = createLinearScale(0, 1, 220, 20);
    expect(y(0)).toBe(220);
    expect(y(1)).toBe(20);
    expect(y(0.5)).toBe(120);
  });

  it("collapses a zero-width domain to the range midpoint", () => {
    const flat = createLinearScale(3, 3, 0, 100);
    expect(flat(3)).toBe(50);
  });
});

describe("computeChartWindow", () => {
  it("spans six hours back to thirty hours ahead, clamped to events", () => {
    const chartWindow = computeChartWindow(events, nowMs);
    expect(chartWindow).toEqual({
      startMs: Date.parse("2026-07-02T12:00:00.000Z"),
      endMs: Date.parse("2026-07-03T18:30:00.000Z"),
    });
  });

  it("clamps the start to the first available event", () => {
    const chartWindow = computeChartWindow(
      events,
      Date.parse("2026-07-02T07:00:00.000Z"),
    );
    expect(chartWindow?.startMs).toBe(Date.parse("2026-07-02T06:00:00.000Z"));
  });

  it("returns null with fewer than two events or no usable overlap", () => {
    expect(computeChartWindow([], nowMs)).toBeNull();
    expect(computeChartWindow([events[0]], nowMs)).toBeNull();
    expect(
      computeChartWindow(events, Date.parse("2026-07-05T00:00:00.000Z")),
    ).toBeNull();
  });
});

describe("sampleCurvePoints", () => {
  it("matches the cosine interpolation at endpoints and midpoint", () => {
    const chartWindow = {
      startMs: Date.parse("2026-07-02T06:00:00.000Z"),
      endMs: Date.parse("2026-07-02T12:00:00.000Z"),
    };
    const points = sampleCurvePoints(firstPair, chartWindow);

    expect(points[0]).toEqual({ ms: chartWindow.startMs, heightM: 0 });
    expect(points[points.length - 1]).toEqual({
      ms: chartWindow.endMs,
      heightM: 1.2,
    });

    const midpoint = points.find(
      (point) => point.ms === Date.parse("2026-07-02T09:00:00.000Z"),
    );
    expect(midpoint?.heightM).toBeCloseTo(0.6, 10);

    const sample = points.find(
      (point) => point.ms === Date.parse("2026-07-02T07:30:00.000Z"),
    );
    expect(sample?.heightM).toBeCloseTo(
      estimateTideHeight(events[0], events[1], "2026-07-02T07:30:00.000Z") ??
        Number.NaN,
      12,
    );
  });

  it("truncates to the window without extrapolating past bounding events", () => {
    const narrow = {
      startMs: Date.parse("2026-07-02T08:00:00.000Z"),
      endMs: Date.parse("2026-07-02T10:00:00.000Z"),
    };
    const narrowPoints = sampleCurvePoints(firstPair, narrow);
    expect(narrowPoints[0].ms).toBe(narrow.startMs);
    expect(narrowPoints[narrowPoints.length - 1].ms).toBe(narrow.endMs);

    const wide = {
      startMs: Date.parse("2026-07-02T00:00:00.000Z"),
      endMs: Date.parse("2026-07-04T00:00:00.000Z"),
    };
    const widePoints = sampleCurvePoints(events, wide);
    expect(widePoints[0].ms).toBe(Date.parse("2026-07-02T06:00:00.000Z"));
    expect(widePoints[widePoints.length - 1].ms).toBe(
      Date.parse("2026-07-03T18:30:00.000Z"),
    );
  });
});

describe("computeHeightDomain", () => {
  it("pads the domain and preserves negative heights", () => {
    const domain = computeHeightDomain([1.2, -0.2, 0.4]);
    expect(domain?.minM).toBeCloseTo(-0.35, 10);
    expect(domain?.maxM).toBeCloseTo(1.35, 10);
  });

  it("applies a minimum pad to flat data and rejects empty input", () => {
    const flat = computeHeightDomain([0.5]);
    expect(flat?.minM).toBeCloseTo(0.35, 10);
    expect(flat?.maxM).toBeCloseTo(0.65, 10);
    expect(computeHeightDomain([])).toBeNull();
  });
});

describe("placeLabel", () => {
  const size = { width: 680, height: 240 };

  it("flips the anchor near either edge to avoid clipping", () => {
    expect(placeLabel(50, size)).toEqual({ x: 56, anchor: "start" });
    expect(placeLabel(340, size)).toEqual({ x: 340, anchor: "middle" });
    expect(placeLabel(660, size)).toEqual({ x: 654, anchor: "end" });
  });
});

describe("buildTideChartModel", () => {
  it("positions markers, the now rule, and axis ticks on stable scales", () => {
    const model = buildTideChartModel(events, nowMs);
    expect(model).not.toBeNull();
    if (!model) {
      return;
    }

    expect(model.markers.map((marker) => marker.id)).toEqual([
      "e2",
      "e3",
      "e4",
      "e5",
      "e6",
      "e7",
    ]);
    expect(model.markers[0].x).toBeCloseTo(CHART_MARGINS.left, 6);
    expect(model.markers[model.markers.length - 1].x).toBeCloseTo(
      DEFAULT_CHART_SIZE.width - CHART_MARGINS.right,
      6,
    );

    const highMarker = model.markers.find((marker) => marker.type === "high");
    const lowMarker = model.markers.find((marker) => marker.type === "low");
    expect(highMarker && lowMarker && highMarker.y < lowMarker.y).toBe(true);

    const plotWidth =
      DEFAULT_CHART_SIZE.width - CHART_MARGINS.left - CHART_MARGINS.right;
    expect(model.now?.x).toBeCloseTo(
      CHART_MARGINS.left + (6 / 30.5) * plotWidth,
      6,
    );
    expect(model.now?.estimatedHeightM).toBeCloseTo(
      estimateTideHeight(events[1], events[2], "2026-07-02T18:00:00.000Z") ??
        Number.NaN,
      12,
    );
    expect(model.now?.y).not.toBeNull();

    expect(model.timeTicks.map((tick) => tick.ms)).toEqual([
      Date.parse("2026-07-02T16:00:00.000Z"),
      Date.parse("2026-07-02T22:00:00.000Z"),
      Date.parse("2026-07-03T04:00:00.000Z"),
      Date.parse("2026-07-03T10:00:00.000Z"),
      Date.parse("2026-07-03T16:00:00.000Z"),
    ]);
    expect(model.heightTicks.map((tick) => tick.label)).toEqual([
      "0.0",
      "0.5",
      "1.0",
    ]);
  });

  it("returns null with fewer than two usable events", () => {
    expect(buildTideChartModel([], nowMs)).toBeNull();
    expect(buildTideChartModel([events[0]], nowMs)).toBeNull();
  });

  it("flips the now label at the window edges", () => {
    const rightModel = buildTideChartModel(
      firstPair,
      Date.parse("2026-07-02T12:00:00.000Z"),
    );
    expect(rightModel?.now?.label.anchor).toBe("end");
    expect(rightModel?.now?.estimatedHeightM).toBe(1.2);

    const leftModel = buildTideChartModel(
      firstPair,
      Date.parse("2026-07-02T06:00:00.000Z"),
    );
    expect(leftModel?.now?.label.anchor).toBe("start");
    expect(leftModel?.now?.estimatedHeightM).toBe(0);
  });

  it("omits the now rule when the current time is outside the window", () => {
    const model = buildTideChartModel(
      firstPair,
      Date.parse("2026-07-02T05:00:00.000Z"),
    );
    expect(model).not.toBeNull();
    expect(model?.now).toBeNull();
  });
});
