import { ProviderError } from "@/data/fetch-json";
import type { DataSource, IsoInstant } from "@/types/domain";

export type UnknownRecord = Record<string, unknown>;

const ISO_INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OPEN_METEO_UTC_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const NOAA_UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

function utcInstantFromParts(parts: readonly number[]): IsoInstant | null {
  const [year, month, day, hour, minute, second = 0] = parts;

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    return null;
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return date.toISOString();
}

function partsFromMatch(match: RegExpMatchArray): number[] {
  return match
    .slice(1)
    .filter((value) => value !== undefined)
    .map(Number);
}

export function isStrictIsoInstant(value: unknown): value is IsoInstant {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) {
    return false;
  }

  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

export function isStrictCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(CALENDAR_DATE_PATTERN);
  if (!match) {
    return false;
  }

  const instant = utcInstantFromParts([...partsFromMatch(match), 0, 0, 0]);
  return instant?.slice(0, 10) === value;
}

export function validationError(
  provider: DataSource,
  message: string,
): ProviderError {
  return new ProviderError(provider, "validation", message);
}

export function expectRecord(
  value: unknown,
  provider: DataSource,
  path: string,
): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw validationError(provider, `${path} must be an object.`);
  }

  return value as UnknownRecord;
}

export function expectArray(
  value: unknown,
  provider: DataSource,
  path: string,
): unknown[] {
  if (!Array.isArray(value)) {
    throw validationError(provider, `${path} must be an array.`);
  }

  return value;
}

export function expectString(
  value: unknown,
  provider: DataSource,
  path: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw validationError(provider, `${path} must be a non-empty string.`);
  }

  return value;
}

export function expectFiniteNumber(
  value: unknown,
  provider: DataSource,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(provider, `${path} must be a finite number.`);
  }

  return value;
}

export function expectNullableNumber(
  value: unknown,
  provider: DataSource,
  path: string,
): number | null {
  if (value === null) {
    return null;
  }

  return expectFiniteNumber(value, provider, path);
}

export function expectStringArray(
  value: unknown,
  provider: DataSource,
  path: string,
): string[] {
  return expectArray(value, provider, path).map((entry, index) =>
    expectString(entry, provider, `${path}[${index}]`),
  );
}

export function expectNullableNumberArray(
  value: unknown,
  provider: DataSource,
  path: string,
): Array<number | null> {
  return expectArray(value, provider, path).map((entry, index) =>
    expectNullableNumber(entry, provider, `${path}[${index}]`),
  );
}

export function expectEqualLength(
  provider: DataSource,
  path: string,
  expected: number,
  values: ReadonlyArray<unknown>,
): void {
  if (values.length !== expected) {
    throw validationError(
      provider,
      `${path} contains ${values.length} values; expected ${expected}.`,
    );
  }
}

export function parseOpenMeteoUtc(
  value: string,
  provider: DataSource,
  path: string,
): IsoInstant {
  const match = value.match(OPEN_METEO_UTC_PATTERN);
  const instant = match ? utcInstantFromParts(partsFromMatch(match)) : null;

  if (!instant) {
    throw validationError(provider, `${path} is not a valid GMT timestamp.`);
  }

  return instant;
}

export function parseNoaaUtc(
  value: string,
  provider: DataSource,
  path: string,
): IsoInstant {
  const match = value.match(NOAA_UTC_PATTERN);
  const instant = match ? utcInstantFromParts(partsFromMatch(match)) : null;

  if (!instant) {
    throw validationError(provider, `${path} is not a NOAA GMT timestamp.`);
  }

  return instant;
}

export function parseCalendarDate(
  value: string,
  provider: DataSource,
  path: string,
): string {
  if (!isStrictCalendarDate(value)) {
    throw validationError(provider, `${path} is not a valid calendar date.`);
  }

  return value;
}
