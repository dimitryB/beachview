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
  const targetSpan = WIND_RULES.materialShiftHours * HOUR_MS;
  const tolerance = WIND_RULES.historyToleranceMinutes * 60 * 1_000;

  return validHours.flatMap((current, index) => {
    const target = current.milliseconds - targetSpan;
    let closest:
      { hour: WeatherForecastHour; milliseconds: number } | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (
      let candidateIndex = index - 1;
      candidateIndex >= 0;
      candidateIndex -= 1
    ) {
      const candidate = validHours[candidateIndex];
      if (!candidate) {
        continue;
      }

      const distance = Math.abs(candidate.milliseconds - target);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }

      if (candidate.milliseconds < target - tolerance) {
        break;
      }
    }

    if (!closest || closestDistance > tolerance) {
      return [];
    }

    const shift = detectMeaningfulWindShift(closest.hour, current.hour);
    return shift ? [shift] : [];
  });
}
