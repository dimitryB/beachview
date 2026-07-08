import { MINUTE_MS, instantMilliseconds } from "@/domain/time";
import type { WeatherForecastHour } from "@/types/domain";

export function findClosestHour<T extends { validAt: string }>(
  instant: string,
  hours: readonly T[],
  toleranceMinutes = 90,
): T | null {
  const target = instantMilliseconds(instant);
  if (
    target === null ||
    !Number.isFinite(toleranceMinutes) ||
    toleranceMinutes < 0
  ) {
    return null;
  }

  let closest: T | null = null;
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

  return closestDistance <= toleranceMinutes * MINUTE_MS ? closest : null;
}

export function findClosestWeatherHour(
  instant: string,
  hours: readonly WeatherForecastHour[],
  toleranceMinutes = 90,
): WeatherForecastHour | null {
  return findClosestHour(instant, hours, toleranceMinutes);
}
