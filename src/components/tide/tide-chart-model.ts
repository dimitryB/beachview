import { estimateTideHeight } from "@/domain/tide";
import {
  HOUR_MS,
  MINUTE_MS,
  instantMilliseconds,
  zonedDateTimeParts,
} from "@/domain/time";
import type { TideEvent, TideEventType } from "@/types/domain";

export interface ChartSize {
  width: number;
  height: number;
}

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartWindow {
  startMs: number;
  endMs: number;
}

export interface HeightDomain {
  minM: number;
  maxM: number;
}

export interface CurvePoint {
  ms: number;
  heightM: number;
}

export type LabelAnchor = "start" | "middle" | "end";

export interface LabelPlacement {
  x: number;
  anchor: LabelAnchor;
}

export interface TideChartMarker {
  id: string;
  type: TideEventType;
  validAt: string;
  heightM: number;
  x: number;
  y: number;
  label: LabelPlacement;
  labelY: number;
}

export interface TideChartNow {
  x: number;
  y: number | null;
  estimatedHeightM: number | null;
  label: LabelPlacement;
}

export interface TimeTick {
  ms: number;
  x: number;
}

export interface HeightTick {
  valueM: number;
  y: number;
  label: string;
}

export interface TideChartModel {
  size: ChartSize;
  margins: ChartMargins;
  window: ChartWindow;
  heightDomain: HeightDomain;
  linePath: string;
  areaPath: string;
  markers: TideChartMarker[];
  now: TideChartNow | null;
  timeTicks: TimeTick[];
  heightTicks: HeightTick[];
  plotTop: number;
  plotBottom: number;
}

export const CHART_MARGINS: ChartMargins = Object.freeze({
  top: 18,
  right: 14,
  bottom: 30,
  left: 46,
});

export const DEFAULT_CHART_SIZE: ChartSize = Object.freeze({
  width: 680,
  height: 240,
});

export const WINDOW_BEFORE_MS = 6 * HOUR_MS;
export const WINDOW_AFTER_MS = 30 * HOUR_MS;
export const CURVE_SAMPLE_STEP_MS = 15 * MINUTE_MS;

const MIN_WINDOW_MS = HOUR_MS;
const HEIGHT_PAD_MIN_M = 0.15;
const HEIGHT_PAD_RATIO = 0.1;
const HEIGHT_TICK_STEPS_M = [0.1, 0.2, 0.25, 0.5, 1, 2, 5];
const TIME_TICK_LOCAL_HOUR_STEP = 6;
const LABEL_EDGE_CLEARANCE_PX = 44;
const LABEL_EDGE_OFFSET_PX = 6;

export type LinearScale = (value: number) => number;

export function createLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): LinearScale {
  const domainSpan = domainMax - domainMin;
  if (domainSpan === 0) {
    return () => (rangeMin + rangeMax) / 2;
  }

  const ratio = (rangeMax - rangeMin) / domainSpan;
  return (value) => rangeMin + (value - domainMin) * ratio;
}

interface TimedTideEvent {
  event: TideEvent;
  ms: number;
}

function timedTideEvents(events: readonly TideEvent[]): TimedTideEvent[] {
  return events
    .map((event) => ({ event, ms: instantMilliseconds(event.validAt) }))
    .filter((entry): entry is TimedTideEvent => entry.ms !== null)
    .sort((left, right) => left.ms - right.ms);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeChartWindow(
  events: readonly TideEvent[],
  nowMs: number,
): ChartWindow | null {
  const timed = timedTideEvents(events);
  if (timed.length < 2) {
    return null;
  }

  const firstEventMs = timed[0].ms;
  const lastEventMs = timed[timed.length - 1].ms;
  const startMs = Math.max(nowMs - WINDOW_BEFORE_MS, firstEventMs);
  const endMs = Math.min(nowMs + WINDOW_AFTER_MS, lastEventMs);

  return endMs - startMs >= MIN_WINDOW_MS ? { startMs, endMs } : null;
}

export function sampleCurvePoints(
  events: readonly TideEvent[],
  chartWindow: ChartWindow,
  stepMs = CURVE_SAMPLE_STEP_MS,
): CurvePoint[] {
  const timed = timedTideEvents(events);
  const points: CurvePoint[] = [];
  const push = (ms: number, heightM: number) => {
    const last = points[points.length - 1];
    if (!last || last.ms !== ms) {
      points.push({ ms, heightM });
    }
  };

  for (let index = 0; index < timed.length - 1; index += 1) {
    const previous = timed[index];
    const next = timed[index + 1];
    if (next.ms <= previous.ms) {
      continue;
    }

    // Truncate to the visible window and to the event pair itself; the
    // cosine curve is never extrapolated beyond bounding events.
    const segmentStart = Math.max(previous.ms, chartWindow.startMs);
    const segmentEnd = Math.min(next.ms, chartWindow.endMs);
    if (segmentEnd <= segmentStart) {
      continue;
    }

    for (let ms = segmentStart; ms < segmentEnd; ms += stepMs) {
      const heightM = estimateTideHeight(
        previous.event,
        next.event,
        new Date(ms).toISOString(),
      );
      if (heightM !== null) {
        push(ms, heightM);
      }
    }

    const endHeightM = estimateTideHeight(
      previous.event,
      next.event,
      new Date(segmentEnd).toISOString(),
    );
    if (endHeightM !== null) {
      push(segmentEnd, endHeightM);
    }
  }

  return points;
}

export function computeHeightDomain(
  heightsM: readonly number[],
): HeightDomain | null {
  if (heightsM.length === 0) {
    return null;
  }

  const minM = Math.min(...heightsM);
  const maxM = Math.max(...heightsM);
  const pad = Math.max(HEIGHT_PAD_MIN_M, (maxM - minM) * HEIGHT_PAD_RATIO);
  return { minM: minM - pad, maxM: maxM + pad };
}

export function computeTimeTickMs(chartWindow: ChartWindow): number[] {
  const ticks: number[] = [];
  const firstWholeHourMs = Math.ceil(chartWindow.startMs / HOUR_MS) * HOUR_MS;

  for (let ms = firstWholeHourMs; ms <= chartWindow.endMs; ms += HOUR_MS) {
    const parts = zonedDateTimeParts(new Date(ms).toISOString());
    if (parts !== null && parts.hour % TIME_TICK_LOCAL_HOUR_STEP === 0) {
      ticks.push(ms);
    }
  }

  return ticks;
}

function heightTickValues(domain: HeightDomain): {
  values: number[];
  decimals: number;
} {
  const targetStep = (domain.maxM - domain.minM) / 4;
  const step =
    HEIGHT_TICK_STEPS_M.find((candidate) => candidate >= targetStep) ??
    HEIGHT_TICK_STEPS_M[HEIGHT_TICK_STEPS_M.length - 1];
  const decimals = step === 0.25 ? 2 : step < 1 ? 1 : 0;
  const firstIndex = Math.ceil(domain.minM / step - 1e-9);
  const lastIndex = Math.floor(domain.maxM / step + 1e-9);
  const values: number[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    values.push(index === 0 ? 0 : index * step);
  }

  return { values, decimals };
}

export function placeLabel(
  x: number,
  size: ChartSize,
  margins: ChartMargins = CHART_MARGINS,
): LabelPlacement {
  if (x - margins.left < LABEL_EDGE_CLEARANCE_PX) {
    return { x: x + LABEL_EDGE_OFFSET_PX, anchor: "start" };
  }

  if (size.width - margins.right - x < LABEL_EDGE_CLEARANCE_PX) {
    return { x: x - LABEL_EDGE_OFFSET_PX, anchor: "end" };
  }

  return { x, anchor: "middle" };
}

function buildNow(
  timed: readonly TimedTideEvent[],
  nowMs: number,
  chartWindow: ChartWindow,
  size: ChartSize,
  xScale: LinearScale,
  yScale: LinearScale,
): TideChartNow | null {
  if (nowMs < chartWindow.startMs || nowMs > chartWindow.endMs) {
    return null;
  }

  let previous: TimedTideEvent | null = null;
  let next: TimedTideEvent | null = null;
  for (const entry of timed) {
    if (entry.ms <= nowMs) {
      previous = entry;
    } else {
      next = entry;
      break;
    }
  }

  const estimatedHeightM =
    previous && previous.ms === nowMs
      ? previous.event.heightM
      : previous && next
        ? estimateTideHeight(
            previous.event,
            next.event,
            new Date(nowMs).toISOString(),
          )
        : null;
  const x = xScale(nowMs);

  return {
    x,
    y: estimatedHeightM === null ? null : yScale(estimatedHeightM),
    estimatedHeightM,
    label: placeLabel(x, size),
  };
}

export function buildTideChartModel(
  events: readonly TideEvent[],
  nowMs: number,
  size: ChartSize = DEFAULT_CHART_SIZE,
): TideChartModel | null {
  const chartWindow = computeChartWindow(events, nowMs);
  if (chartWindow === null) {
    return null;
  }

  const points = sampleCurvePoints(events, chartWindow);
  if (points.length < 2) {
    return null;
  }

  const heightDomain = computeHeightDomain(
    points.map((point) => point.heightM),
  );
  if (heightDomain === null) {
    return null;
  }

  const margins = CHART_MARGINS;
  const plotTop = margins.top;
  const plotBottom = size.height - margins.bottom;
  const xScale = createLinearScale(
    chartWindow.startMs,
    chartWindow.endMs,
    margins.left,
    size.width - margins.right,
  );
  const yScale = createLinearScale(
    heightDomain.minM,
    heightDomain.maxM,
    plotBottom,
    plotTop,
  );

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${round2(xScale(point.ms))} ${round2(
          yScale(point.heightM),
        )}`,
    )
    .join(" ");
  const areaPath = `${linePath} L${round2(
    xScale(points[points.length - 1].ms),
  )} ${plotBottom} L${round2(xScale(points[0].ms))} ${plotBottom} Z`;

  const timed = timedTideEvents(events);
  const markers = timed
    .filter(
      (entry) =>
        entry.ms >= chartWindow.startMs && entry.ms <= chartWindow.endMs,
    )
    .map((entry): TideChartMarker => {
      const x = xScale(entry.ms);
      const y = yScale(entry.event.heightM);
      const labelY =
        entry.event.type === "high"
          ? clamp(y - 12, plotTop + 10, plotBottom - 6)
          : clamp(y + 20, plotTop + 10, plotBottom - 6);

      return {
        id: entry.event.id,
        type: entry.event.type,
        validAt: entry.event.validAt,
        heightM: entry.event.heightM,
        x,
        y,
        label: placeLabel(x, size),
        labelY,
      };
    });

  const timeTicks = computeTimeTickMs(chartWindow).map((ms): TimeTick => ({
    ms,
    x: xScale(ms),
  }));
  const { values, decimals } = heightTickValues(heightDomain);
  const heightTicks = values.map((valueM): HeightTick => ({
    valueM,
    y: yScale(valueM),
    label: valueM.toFixed(decimals),
  }));

  return {
    size,
    margins,
    window: chartWindow,
    heightDomain,
    linePath,
    areaPath,
    markers,
    now: buildNow(timed, nowMs, chartWindow, size, xScale, yScale),
    timeTicks,
    heightTicks,
    plotTop,
    plotBottom,
  };
}
