import { BEACH } from "@/config/location";
import { FISHING_RULES, SWIM_RULES, TIDE_RULES } from "@/config/rules";
import {
  calculatePressureTendencyAt,
  type PressureTendency,
} from "@/domain/pressure";
import {
  MINUTE_MS,
  instantMilliseconds,
  localDateForInstant,
} from "@/domain/time";
import {
  degreesToCardinal,
  findMeaningfulWindShifts,
  type CardinalDirection,
  type WindShift,
} from "@/domain/wind";
import type { TideEvent, WeatherForecastHour } from "@/types/domain";

export type EstimatedTideDirection = "incoming" | "outgoing";

export interface TideRange {
  fromEvent: TideEvent;
  toEvent: TideEvent;
  rangeM: number;
  direction: EstimatedTideDirection;
}

export interface FishingMovementWindow {
  midpointAt: string;
  startAt: string;
  endAt: string;
  localDate: string;
  direction: EstimatedTideDirection;
  rangeM: number;
  fromEvent: TideEvent;
  toEvent: TideEvent;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirectionDeg: number | null;
  windDirection: CardinalDirection | null;
  pressureTendency: PressureTendency;
  isCandidate: boolean;
  label: "Stronger estimated tidal movement";
  explanation: string;
}

export type FishingTimelineEntry =
  | {
      kind: "tide-event";
      validAt: string;
      label: string;
      event: TideEvent;
    }
  | {
      kind: "movement";
      validAt: string;
      label: string;
      movement: FishingMovementWindow;
    }
  | {
      kind: "wind-shift";
      validAt: string;
      label: string;
      shift: WindShift;
    };

export interface FishingForecastDay {
  localDate: string;
  events: TideEvent[];
  tideRanges: TideRange[];
  maximumTideRangeM: number | null;
  movementWindows: FishingMovementWindow[];
  windShifts: WindShift[];
  timeline: FishingTimelineEntry[];
}

function sortedEvents(events: readonly TideEvent[]): TideEvent[] {
  return [...events].sort((left, right) =>
    left.validAt.localeCompare(right.validAt),
  );
}

export function calculateTideRanges(events: readonly TideEvent[]): TideRange[] {
  const sorted = sortedEvents(events);
  const ranges: TideRange[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const fromEvent = sorted[index];
    const toEvent = sorted[index + 1];
    if (!fromEvent || !toEvent || fromEvent.type === toEvent.type) {
      continue;
    }

    ranges.push({
      fromEvent,
      toEvent,
      rangeM: Math.abs(toEvent.heightM - fromEvent.heightM),
      direction: toEvent.type === "high" ? "incoming" : "outgoing",
    });
  }

  return ranges;
}

export function findClosestWeatherHour(
  instant: string,
  hours: readonly WeatherForecastHour[],
): WeatherForecastHour | null {
  const target = instantMilliseconds(instant);
  if (target === null) {
    return null;
  }

  let closest: WeatherForecastHour | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const hour of hours) {
    const milliseconds = instantMilliseconds(hour.validAt);
    if (milliseconds === null) {
      continue;
    }

    const distance = Math.abs(milliseconds - target);
    if (distance < closestDistance) {
      closest = hour;
      closestDistance = distance;
    }
  }

  return closestDistance <=
    FISHING_RULES.weatherMatchToleranceMinutes * MINUTE_MS
    ? closest
    : null;
}

function unavailablePressure(at: string): PressureTendency {
  return {
    state: "unavailable",
    changeHpa: null,
    currentHpa: null,
    previousHpa: null,
    currentAt: at,
    previousAt: null,
    label: "Tendency unavailable",
  };
}

export function buildMovementWindows(
  events: readonly TideEvent[],
  weatherHours: readonly WeatherForecastHour[],
): FishingMovementWindow[] {
  return calculateTideRanges(events).flatMap((range) => {
    const fromTime = instantMilliseconds(range.fromEvent.validAt);
    const toTime = instantMilliseconds(range.toEvent.validAt);
    if (fromTime === null || toTime === null || toTime <= fromTime) {
      return [];
    }

    const midpoint = fromTime + (toTime - fromTime) / 2;
    const slackOffset = TIDE_RULES.slackWindowMinutes * MINUTE_MS;
    const movementOffset = FISHING_RULES.movementHalfWindowMinutes * MINUTE_MS;
    const start = Math.max(midpoint - movementOffset, fromTime + slackOffset);
    const end = Math.min(midpoint + movementOffset, toTime - slackOffset);
    if (end <= start) {
      return [];
    }

    const midpointAt = new Date(midpoint).toISOString();
    const localDate = localDateForInstant(midpointAt);
    if (!localDate) {
      return [];
    }

    const weather = findClosestWeatherHour(midpointAt, weatherHours);
    const windSpeedKmh = weather?.windSpeedKmh ?? null;
    const windGustKmh = weather?.windGustKmh ?? null;
    const windDirectionDeg = weather?.windDirectionDeg ?? null;
    const windDirection =
      windDirectionDeg === null ? null : degreesToCardinal(windDirectionDeg);
    const pressureTendency = weather
      ? calculatePressureTendencyAt(
          weather.validAt,
          weather.pressureHpa,
          weatherHours,
        )
      : unavailablePressure(midpointAt);
    const isCandidate =
      windSpeedKmh !== null && windSpeedKmh < SWIM_RULES.windStrongAtKmh;
    const windExplanation =
      windSpeedKmh === null
        ? "Modeled wind is unavailable near the midpoint."
        : isCandidate
          ? `Modeled wind ${windSpeedKmh.toFixed(1)} km/h is below the configured strong-wind threshold.`
          : `Modeled wind ${windSpeedKmh.toFixed(1)} km/h reaches the configured strong-wind threshold.`;

    return [
      {
        midpointAt,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        localDate,
        direction: range.direction,
        rangeM: range.rangeM,
        fromEvent: range.fromEvent,
        toEvent: range.toEvent,
        windSpeedKmh,
        windGustKmh,
        windDirectionDeg,
        windDirection,
        pressureTendency,
        isCandidate,
        label: "Stronger estimated tidal movement" as const,
        explanation: `Estimated ${range.direction} movement is strongest near the midpoint between NOAA predicted extrema. ${windExplanation}`,
      },
    ];
  });
}

function timelineEntries(
  events: readonly TideEvent[],
  movementWindows: readonly FishingMovementWindow[],
  windShifts: readonly WindShift[],
): FishingTimelineEntry[] {
  const entries: FishingTimelineEntry[] = [
    ...events.map((event): FishingTimelineEntry => ({
      kind: "tide-event",
      validAt: event.validAt,
      label: `Predicted ${event.type} tide ${event.heightM.toFixed(2)} m MLLW`,
      event,
    })),
    ...movementWindows.map((movement): FishingTimelineEntry => ({
      kind: "movement",
      validAt: movement.midpointAt,
      label: `${movement.label} · ${movement.direction}`,
      movement,
    })),
    ...windShifts.map((shift): FishingTimelineEntry => ({
      kind: "wind-shift",
      validAt: shift.toAt,
      label: `Modeled wind shift ${shift.fromDirection} → ${shift.toDirection} (${shift.changeDeg.toFixed(0)}°)`,
      shift,
    })),
  ];

  return entries.sort(
    (left, right) =>
      left.validAt.localeCompare(right.validAt) ||
      left.kind.localeCompare(right.kind),
  );
}

export function buildFishingForecast(
  events: readonly TideEvent[],
  weatherHours: readonly WeatherForecastHour[],
  referenceInstant: string,
): FishingForecastDay[] {
  const startLocalDate = localDateForInstant(referenceInstant);
  if (!startLocalDate) {
    return [];
  }

  const ranges = calculateTideRanges(events);
  const movements = buildMovementWindows(events, weatherHours);
  const shifts = findMeaningfulWindShifts(weatherHours);
  const dates = new Set<string>();

  for (const event of events) {
    dates.add(event.localDate);
  }
  for (const movement of movements) {
    dates.add(movement.localDate);
  }
  for (const shift of shifts) {
    const localDate = localDateForInstant(shift.toAt);
    if (localDate) {
      dates.add(localDate);
    }
  }

  return [...dates]
    .filter((localDate) => localDate >= startLocalDate)
    .sort()
    .slice(0, BEACH.forecastDays)
    .map((localDate) => {
      const dailyEvents = sortedEvents(
        events.filter((event) => event.localDate === localDate),
      );
      const dailyMovements = movements.filter(
        (movement) => movement.localDate === localDate,
      );
      const dailyRanges = ranges.filter(
        (range) =>
          localDateForInstant(
            new Date(
              ((instantMilliseconds(range.fromEvent.validAt) ?? 0) +
                (instantMilliseconds(range.toEvent.validAt) ?? 0)) /
                2,
            ).toISOString(),
          ) === localDate,
      );
      const dailyShifts = shifts.filter(
        (shift) => localDateForInstant(shift.toAt) === localDate,
      );

      return {
        localDate,
        events: dailyEvents,
        tideRanges: dailyRanges,
        maximumTideRangeM:
          dailyRanges.length > 0
            ? Math.max(...dailyRanges.map((range) => range.rangeM))
            : null,
        movementWindows: dailyMovements,
        windShifts: dailyShifts,
        timeline: timelineEntries(dailyEvents, dailyMovements, dailyShifts),
      };
    });
}
