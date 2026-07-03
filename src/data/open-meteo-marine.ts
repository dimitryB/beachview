import { BEACH } from "@/config/location";
import { fetchJson, ProviderError } from "@/data/fetch-json";
import {
  expectEqualLength,
  expectFiniteNumber,
  expectNullableNumber,
  expectNullableNumberArray,
  expectRecord,
  expectString,
  expectStringArray,
  parseOpenMeteoUtc,
  validationError,
} from "@/data/validation";
import type {
  DataPoint,
  MarineDataset,
  MarineForecastHour,
} from "@/types/domain";
import type { JsonFetcher } from "@/types/providers";

const SOURCE = "open-meteo-marine" as const;
const VARIABLES = "wave_height,wave_period,sea_surface_temperature";

function expectUnit(
  units: Record<string, unknown>,
  key: string,
  expected: string,
  path: string,
): void {
  const actual = expectString(units[key], SOURCE, `${path}.${key}`);

  if (actual !== expected) {
    throw validationError(
      SOURCE,
      `${path}.${key} must be ${expected}; received ${actual}.`,
    );
  }
}

function modeledPoint(
  value: number | null,
  validAt: string,
  fetchedAt: string,
): DataPoint<number> {
  return {
    value,
    validAt,
    fetchedAt,
    source: SOURCE,
    kind: "modeled",
  };
}

export function buildMarineUrl(): string {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(BEACH.latitude));
  url.searchParams.set("longitude", String(BEACH.longitude));
  url.searchParams.set("current", VARIABLES);
  url.searchParams.set("hourly", VARIABLES);
  url.searchParams.set("forecast_days", String(BEACH.forecastDays));
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("length_unit", "metric");
  url.searchParams.set("velocity_unit", "kmh");
  url.searchParams.set("cell_selection", "sea");
  return url.toString();
}

export function parseMarineResponse(
  value: unknown,
  fetchedAt: string,
): MarineDataset {
  const root = expectRecord(value, SOURCE, "marine response");

  if (root.error === true) {
    const reason =
      typeof root.reason === "string" ? root.reason : "Unknown provider error.";
    throw new ProviderError(SOURCE, "validation", `Open-Meteo: ${reason}`);
  }

  const returnedLatitude = expectFiniteNumber(
    root.latitude,
    SOURCE,
    "latitude",
  );
  const returnedLongitude = expectFiniteNumber(
    root.longitude,
    SOURCE,
    "longitude",
  );
  const current = expectRecord(root.current, SOURCE, "current");
  const currentUnits = expectRecord(
    root.current_units,
    SOURCE,
    "current_units",
  );
  const hourly = expectRecord(root.hourly, SOURCE, "hourly");
  const hourlyUnits = expectRecord(root.hourly_units, SOURCE, "hourly_units");

  for (const [key, unit] of [
    ["wave_height", "m"],
    ["wave_period", "s"],
    ["sea_surface_temperature", "°C"],
  ] as const) {
    expectUnit(currentUnits, key, unit, "current_units");
    expectUnit(hourlyUnits, key, unit, "hourly_units");
  }

  const currentValidAt = parseOpenMeteoUtc(
    expectString(current.time, SOURCE, "current.time"),
    SOURCE,
    "current.time",
  );
  const times = expectStringArray(hourly.time, SOURCE, "hourly.time");
  const waveHeight = expectNullableNumberArray(
    hourly.wave_height,
    SOURCE,
    "hourly.wave_height",
  );
  const wavePeriod = expectNullableNumberArray(
    hourly.wave_period,
    SOURCE,
    "hourly.wave_period",
  );
  const seaSurfaceTemperature = expectNullableNumberArray(
    hourly.sea_surface_temperature,
    SOURCE,
    "hourly.sea_surface_temperature",
  );

  expectEqualLength(SOURCE, "hourly.wave_height", times.length, waveHeight);
  expectEqualLength(SOURCE, "hourly.wave_period", times.length, wavePeriod);
  expectEqualLength(
    SOURCE,
    "hourly.sea_surface_temperature",
    times.length,
    seaSurfaceTemperature,
  );

  const normalizedHourly: MarineForecastHour[] = times.map((time, index) => ({
    validAt: parseOpenMeteoUtc(time, SOURCE, `hourly.time[${index}]`),
    waveHeightM: waveHeight[index] ?? null,
    wavePeriodS: wavePeriod[index] ?? null,
    seaSurfaceTemperatureC: seaSurfaceTemperature[index] ?? null,
  }));

  return {
    source: SOURCE,
    fetchedAt,
    grid: {
      requestedLatitude: BEACH.latitude,
      requestedLongitude: BEACH.longitude,
      returnedLatitude,
      returnedLongitude,
    },
    current: {
      waveHeightM: modeledPoint(
        expectNullableNumber(
          current.wave_height,
          SOURCE,
          "current.wave_height",
        ),
        currentValidAt,
        fetchedAt,
      ),
      wavePeriodS: modeledPoint(
        expectNullableNumber(
          current.wave_period,
          SOURCE,
          "current.wave_period",
        ),
        currentValidAt,
        fetchedAt,
      ),
      seaSurfaceTemperatureC: modeledPoint(
        expectNullableNumber(
          current.sea_surface_temperature,
          SOURCE,
          "current.sea_surface_temperature",
        ),
        currentValidAt,
        fetchedAt,
      ),
    },
    hourly: normalizedHourly,
  };
}

export async function fetchMarine(
  jsonFetcher: JsonFetcher = fetchJson,
): Promise<MarineDataset> {
  const result = await jsonFetcher({
    provider: SOURCE,
    url: buildMarineUrl(),
  });

  return parseMarineResponse(result.data, result.fetchedAt);
}
