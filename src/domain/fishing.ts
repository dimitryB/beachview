import { BEACH } from "@/config/location";
import {
  FISHING_RULES,
  SWIM_RULES,
  TIDE_RULES,
  type SwimRules,
} from "@/config/rules";
import {
  calculatePressureTendencyAt,
  type PressureTendency,
} from "@/domain/pressure";
import {
  calculateMoonPhase,
  calculateSolunarPeriods,
  type MoonPhase,
  type SolunarPeriod,
  type SolunarPeriodKind,
} from "@/domain/moon";
import {
  HOUR_MS,
  MINUTE_MS,
  instantMilliseconds,
  localDateForInstant,
} from "@/domain/time";
import { findClosestHour, findClosestWeatherHour } from "@/domain/weather";
import {
  circularDirectionDifference,
  degreesToCardinal,
  findMeaningfulWindShifts,
  type CardinalDirection,
  type WindShift,
} from "@/domain/wind";
import type {
  MarineForecastHour,
  OfficialAlert,
  SolarDay,
  TideEvent,
  WeatherForecastHour,
} from "@/types/domain";

export type EstimatedTideDirection = "incoming" | "outgoing";

export type MovementStrength = "weak" | "moderate" | "strong";

export type ShoreWindClass = "onshore" | "offshore" | "alongshore";

export type TwilightOverlap = "dawn" | "dusk";

export type CandidateFocusLevel = "strong" | "context";

export interface CandidateFocus {
  level: CandidateFocusLevel;
  label: "Focused candidate";
  reasons: string[];
}

// Optional informational inputs. Missing context leaves the matching window
// fields null without changing candidacy (DATA_AND_RULES §13.4).
export interface FishingContext {
  solarDays?: readonly SolarDay[];
  marineHours?: readonly MarineForecastHour[];
  solunarPeriods?: readonly SolunarPeriod[];
}

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
  shoreWind: ShoreWindClass | null;
  waveHeightM: number | null;
  peakRateMPerH: number;
  strength: MovementStrength;
  twilightOverlap: TwilightOverlap | null;
  solunarOverlap: SolunarPeriodKind | null;
  pressureTendency: PressureTendency;
  isCandidate: boolean;
  focus: CandidateFocus | null;
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
  moonPhase: MoonPhase | null;
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

function findOverlappingAlert(
  startMilliseconds: number,
  endMilliseconds: number,
  alerts: readonly OfficialAlert[],
): OfficialAlert | null {
  return (
    alerts.find((alert) => {
      const alertStart = instantMilliseconds(alert.effectiveAt);
      const alertEnd = instantMilliseconds(alert.expiresAt);
      return (
        alertStart !== null &&
        alertEnd !== null &&
        alertStart < endMilliseconds &&
        alertEnd > startMilliseconds
      );
    }) ?? null
  );
}

// Peak rate of the cosine tide-height curve between adjacent extrema:
// h(t) follows (1 - cos(πx)) / 2, whose derivative peaks at the midpoint
// with value π × range / (2 × duration).
export function estimatePeakRateMPerH(
  rangeM: number,
  durationMs: number,
): number {
  if (!Number.isFinite(rangeM) || durationMs <= 0) {
    return 0;
  }
  return (Math.PI * rangeM) / (2 * (durationMs / HOUR_MS));
}

export function classifyMovementStrength(
  peakRateMPerH: number,
): MovementStrength {
  if (peakRateMPerH >= FISHING_RULES.movementStrongAtMPerH) {
    return "strong";
  }
  return peakRateMPerH >= FISHING_RULES.movementModerateAtMPerH
    ? "moderate"
    : "weak";
}

export function classifyShoreWind(
  windFromDeg: number,
  shoreFacingDeg: number = BEACH.shoreFacingDeg,
): ShoreWindClass | null {
  const difference = circularDirectionDifference(windFromDeg, shoreFacingDeg);
  if (difference === null) {
    return null;
  }
  if (difference <= FISHING_RULES.onshoreAtMostDeg) {
    return "onshore";
  }
  return difference >= FISHING_RULES.offshoreAtLeastDeg
    ? "offshore"
    : "alongshore";
}

function overlaps(
  startMs: number,
  endMs: number,
  otherStartMs: number | null,
  otherEndMs: number | null,
): boolean {
  return (
    otherStartMs !== null &&
    otherEndMs !== null &&
    otherStartMs < endMs &&
    otherEndMs > startMs
  );
}

export function findTwilightOverlap(
  startMs: number,
  endMs: number,
  solarDays: readonly SolarDay[],
): TwilightOverlap | null {
  const halfWindowMs = FISHING_RULES.twilightHalfWindowMinutes * MINUTE_MS;
  for (const day of solarDays) {
    for (const [boundary, overlap] of [
      [day.sunriseAt, "dawn"],
      [day.sunsetAt, "dusk"],
    ] as const) {
      if (boundary === null) {
        continue;
      }
      const boundaryMs = instantMilliseconds(boundary);
      if (
        boundaryMs !== null &&
        overlaps(
          startMs,
          endMs,
          boundaryMs - halfWindowMs,
          boundaryMs + halfWindowMs,
        )
      ) {
        return overlap;
      }
    }
  }
  return null;
}

export function findSolunarOverlap(
  startMs: number,
  endMs: number,
  periods: readonly SolunarPeriod[],
): SolunarPeriodKind | null {
  let minorOverlap = false;
  for (const period of periods) {
    if (
      overlaps(
        startMs,
        endMs,
        instantMilliseconds(period.startAt),
        instantMilliseconds(period.endAt),
      )
    ) {
      if (period.kind === "major") {
        return "major";
      }
      minorOverlap = true;
    }
  }
  return minorOverlap ? "minor" : null;
}

function candidateFocusForWindow({
  isCandidate,
  shoreWind,
  solunarOverlap,
  strength,
  swimRules,
  twilightOverlap,
  windGustKmh,
  windSpeedKmh,
}: {
  isCandidate: boolean;
  shoreWind: ShoreWindClass | null;
  solunarOverlap: SolunarPeriodKind | null;
  strength: MovementStrength;
  swimRules: Readonly<SwimRules>;
  twilightOverlap: TwilightOverlap | null;
  windGustKmh: number | null;
  windSpeedKmh: number | null;
}): CandidateFocus | null {
  if (!isCandidate || strength === "weak") {
    return null;
  }

  const windBelowWarning =
    windSpeedKmh !== null &&
    windGustKmh !== null &&
    windSpeedKmh < swimRules.windWarningAtKmh &&
    windGustKmh < swimRules.windGustWarningAtKmh;
  if (!windBelowWarning) {
    return null;
  }

  const reasons: string[] = [
    `${strength} estimated tide movement`,
    "wind below warning thresholds",
  ];
  let contextSignals = 0;

  if (solunarOverlap === "major") {
    reasons.push("major solunar overlap");
    contextSignals += 1;
  } else if (solunarOverlap === "minor") {
    reasons.push("minor solunar overlap");
  }

  if (twilightOverlap !== null) {
    reasons.push(`${twilightOverlap} twilight overlap`);
    contextSignals += 1;
  }

  if (shoreWind === "offshore" || shoreWind === "alongshore") {
    reasons.push(`${shoreWind} wind`);
  }

  if (strength === "strong") {
    return {
      level: "strong",
      label: "Focused candidate",
      reasons,
    };
  }

  return contextSignals >= FISHING_RULES.focusExtraContextSignals
    ? {
        level: "context",
        label: "Focused candidate",
        reasons,
      }
    : null;
}

export function buildMovementWindows(
  events: readonly TideEvent[],
  weatherHours: readonly WeatherForecastHour[],
  alerts: readonly OfficialAlert[] = [],
  swimRules: Readonly<SwimRules> = SWIM_RULES,
  context: Readonly<FishingContext> = {},
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

    const weather = findClosestWeatherHour(
      midpointAt,
      weatherHours,
      FISHING_RULES.weatherMatchToleranceMinutes,
    );
    const windSpeedKmh = weather?.windSpeedKmh ?? null;
    const windGustKmh = weather?.windGustKmh ?? null;
    const windDirectionDeg = weather?.windDirectionDeg ?? null;
    const windDirection =
      windDirectionDeg === null ? null : degreesToCardinal(windDirectionDeg);
    const shoreWind =
      windDirectionDeg === null ? null : classifyShoreWind(windDirectionDeg);
    const marineHour = context.marineHours
      ? findClosestHour(
          midpointAt,
          context.marineHours,
          FISHING_RULES.marineMatchToleranceMinutes,
        )
      : null;
    const waveHeightM = marineHour?.waveHeightM ?? null;
    const peakRateMPerH = estimatePeakRateMPerH(
      range.rangeM,
      toTime - fromTime,
    );
    const strength = classifyMovementStrength(peakRateMPerH);
    const twilightOverlap = context.solarDays
      ? findTwilightOverlap(start, end, context.solarDays)
      : null;
    const solunarOverlap = context.solunarPeriods
      ? findSolunarOverlap(start, end, context.solunarPeriods)
      : null;
    const pressureTendency = weather
      ? calculatePressureTendencyAt(
          weather.validAt,
          weather.pressureHpa,
          weatherHours,
        )
      : unavailablePressure(midpointAt);
    // An official severe weather or surf alert always outranks a favorable
    // derived state, so an overlapping alert disqualifies the window.
    const overlappingAlert = findOverlappingAlert(start, end, alerts);
    const windBelowStrong =
      windSpeedKmh !== null && windSpeedKmh < swimRules.windStrongAtKmh;
    // A configured red strong-wind or strong-gust state, as well as missing
    // wind data, outranks a favorable window (rule precedence).
    const gustBelowStrong =
      windGustKmh !== null && windGustKmh < swimRules.windGustStrongAtKmh;
    const isCandidate =
      windBelowStrong && gustBelowStrong && overlappingAlert === null;
    const focus = candidateFocusForWindow({
      isCandidate,
      shoreWind,
      solunarOverlap,
      strength,
      swimRules,
      twilightOverlap,
      windGustKmh,
      windSpeedKmh,
    });
    const windExplanation =
      windSpeedKmh === null
        ? "Modeled wind is unavailable near the midpoint."
        : windBelowStrong
          ? `Modeled wind ${windSpeedKmh.toFixed(1)} km/h is below the configured strong-wind threshold.`
          : `Modeled wind ${windSpeedKmh.toFixed(1)} km/h reaches the configured strong-wind threshold.`;
    const gustExplanation =
      windGustKmh === null
        ? " Modeled wind gust is unavailable near the midpoint, so it is not a candidate."
        : gustBelowStrong
          ? ""
          : ` Modeled gust ${windGustKmh.toFixed(1)} km/h reaches the configured strong-gust threshold.`;
    const alertExplanation = overlappingAlert
      ? ` An official alert is active during this window (${overlappingAlert.headline}), so it is not a candidate.`
      : "";

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
        shoreWind,
        waveHeightM,
        peakRateMPerH,
        strength,
        twilightOverlap,
        solunarOverlap,
        pressureTendency,
        isCandidate,
        focus,
        label: "Stronger estimated tidal movement" as const,
        explanation: `Estimated ${range.direction} movement is strongest near the midpoint between NOAA predicted extrema. ${windExplanation}${gustExplanation}${alertExplanation}`,
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
  alerts: readonly OfficialAlert[] = [],
  swimRules: Readonly<SwimRules> = SWIM_RULES,
  context: Readonly<FishingContext> = {},
): FishingForecastDay[] {
  const startLocalDate = localDateForInstant(referenceInstant);
  if (!startLocalDate) {
    return [];
  }

  const referenceMs = instantMilliseconds(referenceInstant);
  const solunarPeriods =
    context.solunarPeriods ??
    (referenceMs === null
      ? []
      : calculateSolunarPeriods(
          new Date(referenceMs - 12 * HOUR_MS).toISOString(),
          new Date(
            referenceMs + (BEACH.forecastDays + 1) * 24 * HOUR_MS,
          ).toISOString(),
          BEACH.latitude,
          BEACH.longitude,
        ));
  const ranges = calculateTideRanges(events);
  const movements = buildMovementWindows(
    events,
    weatherHours,
    alerts,
    swimRules,
    { ...context, solunarPeriods },
  );
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
        // The phase changes about 12° per day, so evaluating at a fixed
        // UTC noon of the Eastern calendar date is precise enough for a
        // daily label.
        moonPhase: calculateMoonPhase(`${localDate}T12:00:00.000Z`),
        movementWindows: dailyMovements,
        windShifts: dailyShifts,
        timeline: timelineEntries(dailyEvents, dailyMovements, dailyShifts),
      };
    });
}
