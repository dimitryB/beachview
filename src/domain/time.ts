import { BEACH } from "@/config/location";

export const HOUR_MS = 60 * 60 * 1_000;
export const MINUTE_MS = 60 * 1_000;

export interface ZonedDateTimeParts {
  localDate: string;
  hour: number;
  minute: number;
}

const zonedFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BEACH.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
});

export function instantMilliseconds(instant: string): number | null {
  const milliseconds = Date.parse(instant);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

export function zonedDateTimeParts(instant: string): ZonedDateTimeParts | null {
  const milliseconds = instantMilliseconds(instant);
  if (milliseconds === null) {
    return null;
  }

  const parts = zonedFormatter.formatToParts(new Date(milliseconds));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));

  if (
    !year ||
    !month ||
    !day ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  return {
    localDate: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

export function localDateForInstant(instant: string): string | null {
  return zonedDateTimeParts(instant)?.localDate ?? null;
}

export function addMilliseconds(
  instant: string,
  millisecondsToAdd: number,
): string | null {
  const milliseconds = instantMilliseconds(instant);
  return milliseconds === null
    ? null
    : new Date(milliseconds + millisecondsToAdd).toISOString();
}

export function signedHoursBetween(
  earlierInstant: string,
  laterInstant: string,
): number | null {
  const earlier = instantMilliseconds(earlierInstant);
  const later = instantMilliseconds(laterInstant);
  return earlier === null || later === null
    ? null
    : (later - earlier) / HOUR_MS;
}
