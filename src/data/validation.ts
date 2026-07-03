import { ProviderError } from "@/data/fetch-json";
import type { DataSource, IsoInstant } from "@/types/domain";

export type UnknownRecord = Record<string, unknown>;

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
  const normalized = value.endsWith("Z")
    ? value
    : `${value}${value.length === 16 ? ":00" : ""}Z`;
  const milliseconds = Date.parse(normalized);

  if (!Number.isFinite(milliseconds)) {
    throw validationError(provider, `${path} is not a valid GMT timestamp.`);
  }

  return new Date(milliseconds).toISOString();
}

export function parseNoaaUtc(
  value: string,
  provider: DataSource,
  path: string,
): IsoInstant {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    throw validationError(provider, `${path} is not a NOAA GMT timestamp.`);
  }

  return parseOpenMeteoUtc(value.replace(" ", "T"), provider, path);
}
