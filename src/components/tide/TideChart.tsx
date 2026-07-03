import { useEffect, useRef, useState } from "react";

import { DataStatus } from "@/components/conditions/DataStatus";
import { ProviderNotice } from "@/components/conditions/ProviderNotice";
import {
  formatDurationMinutes,
  formatEasternEventTime,
} from "@/components/format";
import { buildTideChartModel } from "@/components/tide/tide-chart-model";
import { BEACH } from "@/config/location";
import { deriveTideState, type DerivedTideState } from "@/domain/tide";
import { useCurrentTime } from "@/hooks/use-current-time";
import type { ProviderState, TideDataset, TideEventType } from "@/types/domain";

interface TideChartProps {
  onRetry: () => void;
  tides: ProviderState<TideDataset>;
}

interface TideTableRow {
  id: string;
  type: TideEventType;
  validAt: string;
  heightM: number;
}

const DEFAULT_CHART_WIDTH_PX = 680;
const MIN_CHART_WIDTH_PX = 240;
const WIDE_CHART_AT_PX = 640;
const NO_MODEL_TABLE_ROW_LIMIT = 8;

const axisHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BEACH.timezone,
  hour: "numeric",
});

function eventGlyph(type: TideEventType): string {
  return type === "high" ? "▲" : "▼";
}

function eventLabel(type: TideEventType): string {
  return type === "high" ? "High" : "Low";
}

function nextEventSentence(state: DerivedTideState): string {
  if (!state.next) {
    return "Next predicted event is outside the cached range.";
  }

  const time = formatEasternEventTime(state.next.validAt);
  const duration = formatDurationMinutes(state.minutesUntilNextEvent);
  return `Next predicted ${state.next.type} ${state.next.heightM.toFixed(2)} m at ${time}${duration ? ` (in ${duration})` : ""}.`;
}

export function TideChart({ onRetry, tides }: TideChartProps) {
  const currentTime = useCurrentTime();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(DEFAULT_CHART_WIDTH_PX);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) {
        setChartWidth(Math.max(MIN_CHART_WIDTH_PX, Math.round(width)));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const events = tides.data?.events ?? [];
  const chartHeight = chartWidth >= WIDE_CHART_AT_PX ? 260 : 220;
  const model =
    currentTime === null
      ? null
      : buildTideChartModel(events, currentTime, {
          width: chartWidth,
          height: chartHeight,
        });
  const tideState =
    tides.data && currentTime !== null
      ? deriveTideState(events, new Date(currentTime).toISOString())
      : null;
  const tableRows: TideTableRow[] = model
    ? model.markers
    : [...events]
        .sort(
          (left, right) => Date.parse(left.validAt) - Date.parse(right.validAt),
        )
        .slice(0, NO_MODEL_TABLE_ROW_LIMIT);

  return (
    <section aria-labelledby="tide-heading" className="panel tide-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Predicted tide</p>
          <h2 id="tide-heading">Today and tomorrow at Sandbridge</h2>
        </div>
        <DataStatus label="NOAA · MLLW" state={tides} />
      </div>
      <ProviderNotice label="NOAA tide" onRetry={onRetry} state={tides} />
      {tideState ? (
        <p className="tide-chart__summary">
          <strong>Predicted phase: {tideState.phaseLabel}.</strong>{" "}
          {tideState.estimatedHeightM !== null
            ? `Estimated ${tideState.estimatedHeightM.toFixed(2)} m between NOAA high/low predictions.`
            : "Estimated current height is unavailable."}{" "}
          {nextEventSentence(tideState)}
        </p>
      ) : null}
      <div className="tide-chart" ref={containerRef}>
        {model ? (
          <svg
            aria-label={`Estimated ${BEACH.name} tide height in meters above MLLW, interpolated between NOAA predicted high and low events. The summary and event table nearby list the same predictions.`}
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <g aria-hidden="true">
              <text className="tide-chart__axis-unit" x={4} y={12}>
                m MLLW
              </text>
              {model.heightTicks.map((tick) => (
                <g key={tick.valueM}>
                  <line
                    className="tide-chart__grid"
                    x1={model.margins.left}
                    x2={chartWidth - model.margins.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text
                    textAnchor="end"
                    x={model.margins.left - 8}
                    y={tick.y + 4}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}
              {model.timeTicks.map((tick) => (
                <g key={tick.ms}>
                  <line
                    className="tide-chart__grid"
                    x1={tick.x}
                    x2={tick.x}
                    y1={model.plotTop}
                    y2={model.plotBottom + 5}
                  />
                  <text textAnchor="middle" x={tick.x} y={chartHeight - 8}>
                    {axisHourFormatter.format(new Date(tick.ms))}
                  </text>
                </g>
              ))}
              <line
                className="tide-chart__grid"
                x1={model.margins.left}
                x2={chartWidth - model.margins.right}
                y1={model.plotBottom}
                y2={model.plotBottom}
              />
              <path className="tide-chart__area" d={model.areaPath} />
              <path className="tide-chart__line" d={model.linePath} />
              {model.markers.map((marker) => (
                <g className="tide-chart__marker" key={marker.id}>
                  <circle cx={marker.x} cy={marker.y} r={3.5} />
                  <text
                    textAnchor={marker.label.anchor}
                    x={marker.label.x}
                    y={marker.labelY}
                  >
                    {eventGlyph(marker.type)} {eventLabel(marker.type)}{" "}
                    {marker.heightM.toFixed(2)} m
                  </text>
                </g>
              ))}
              {model.now ? (
                <g>
                  <line
                    className="tide-chart__now-rule"
                    x1={model.now.x}
                    x2={model.now.x}
                    y1={model.plotTop}
                    y2={model.plotBottom}
                  />
                  {model.now.y !== null ? (
                    <circle
                      className="tide-chart__now-point"
                      cx={model.now.x}
                      cy={model.now.y}
                      r={5}
                    />
                  ) : null}
                  <text
                    className="tide-chart__now-label"
                    textAnchor={model.now.label.anchor}
                    x={model.now.label.x}
                    y={model.plotTop - 6}
                  >
                    Now
                  </text>
                </g>
              ) : null}
            </g>
          </svg>
        ) : (
          <p className="tide-chart__empty">
            {tides.data
              ? "Tide predictions do not cover enough of the current period to draw the estimated curve."
              : (tides.error ?? "Loading NOAA high and low predictions.")}
          </p>
        )}
      </div>
      {tableRows.length > 0 ? (
        <table className="tide-table">
          <caption className="sr-only">
            NOAA predicted tide events for Sandbridge
          </caption>
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Height (m MLLW)</th>
              <th scope="col">Time (Eastern)</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  <span aria-hidden="true">{eventGlyph(row.type)}</span>{" "}
                  {eventLabel(row.type)}
                </th>
                <td>{row.heightM.toFixed(2)} m</td>
                <td>{formatEasternEventTime(row.validAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tides.data && currentTime !== null ? (
        <p className="tide-events__empty">
          No predicted events are available in the cached range.
        </p>
      ) : null}
    </section>
  );
}
