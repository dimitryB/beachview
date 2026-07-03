import { WIND_RULES } from "@/config/rules";
import { HOUR_MS, instantMilliseconds } from "@/domain/time";
import type { WeatherForecastHour } from "@/types/domain";

export const CARDINAL_DIRECTIONS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export interface WindShift {
  fromAt: string;
  toAt: string;
  fromDirectionDeg: number;
  toDirectionDeg: number;
  fromDirection: CardinalDirection;
  toDirection: CardinalDirection;
  changeDeg: number;
  fromSpeedKmh: number;
  toSpeedKmh: number;
}

export function normalizeDegrees(degrees: number): number | null {
  if (!Number.isFinite(degrees)) {
    return null;
  }

  const normalized = ((degrees % 360) + 360) % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function degreesToCardinal(degrees: number): CardinalDirection | null {
  const normalized = normalizeDegrees(degrees);
  if (normalized === null) {
    return null;
  }

  const index = Math.floor((normalized + 11.25) / 22.5) % 16;
  return CARDINAL_DIRECTIONS[index] ?? null;
}

export function circularDirectionDifference(
  firstDegrees: number,
  secondDegrees: number,
): number | null {
  const first = normalizeDegrees(firstDegrees);
  const second = normalizeDegrees(secondDegrees);
  if (first === null || second === null) {
    return null;
  }

  const directDifference = Math.abs(first - second);
  return Math.min(directDifference, 360 - directDifference);
}

export function detectMeaningfulWindShift(
  from: WeatherForecastHour,
  to: WeatherForecastHour,
): WindShift | null {
  const fromDirection = from.windDirectionDeg;
  const toDirection = to.windDirectionDeg;
  const fromSpeed = from.windSpeedKmh;
  const toSpeed = to.windSpeedKmh;

  if (
    fromDirection === null ||
    toDirection === null ||
    fromSpeed === null ||
    toSpeed === null ||
    fromSpeed < WIND_RULES.meaningfulSpeedAtKmh ||
    toSpeed < WIND_RULES.meaningfulSpeedAtKmh
  ) {
    return null;
  }

  const changeDeg = circularDirectionDifference(fromDirection, toDirection);
  const fromCardinal = degreesToCardinal(fromDirection);
  const toCardinal = degreesToCardinal(toDirection);

  if (
    changeDeg === null ||
    changeDeg < WIND_RULES.materialShiftAtDeg ||
    fromCardinal === null ||
    toCardinal === null
  ) {
    return null;
  }

  return {
    fromAt: from.validAt,
    toAt: to.validAt,
    fromDirectionDeg: normalizeDegrees(fromDirection) ?? fromDirection,
    toDirectionDeg: normalizeDegrees(toDirection) ?? toDirection,
    fromDirection: fromCardinal,
    toDirection: toCardinal,
    changeDeg,
    fromSpeedKmh: fromSpeed,
    toSpeedKmh: toSpeed,
  };
}

export function findMeaningfulWindShifts(
  hours: readonly WeatherForecastHour[],
): WindShift[] {
  const validHours = hours
    .map((hour) => ({
      hour,
      milliseconds: instantMilliseconds(hour.validAt),
    }))
    .filter(
      (entry): entry is { hour: WeatherForecastHour; milliseconds: number } =>
        entry.milliseconds !== null,
    )
    .sort((left, right) => left.milliseconds - right.milliseconds);
  const maximumSpan = WIND_RULES.materialShiftHours * HOUR_MS;
  const shifts: WindShift[] = [];
  let lastShiftEnd = Number.NEGATIVE_INFINITY;

  // A material shift is any pair of samples no more than materialShiftHours
  // apart whose direction change reaches the configured threshold. Report a
  // shift at the earliest hour the threshold is met, spanning back to the
  // earliest qualifying sample, and treat later detections that start at or
  // before an already-reported shift's end as continuations of that shift.
  for (let toIndex = 0; toIndex < validHours.length; toIndex += 1) {
    const to = validHours[toIndex];
    if (!to) {
      continue;
    }

    for (let fromIndex = 0; fromIndex < toIndex; fromIndex += 1) {
      const from = validHours[fromIndex];
      if (!from) {
        continue;
      }

      const span = to.milliseconds - from.milliseconds;
      if (
        span > maximumSpan ||
        span <= 0 ||
        from.milliseconds <= lastShiftEnd
      ) {
        continue;
      }

      const shift = detectMeaningfulWindShift(from.hour, to.hour);
      if (shift) {
        shifts.push(shift);
        lastShiftEnd = to.milliseconds;
        break;
      }
    }
  }

  return shifts;
}
