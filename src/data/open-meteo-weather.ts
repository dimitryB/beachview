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
  parseCalendarDate,
  parseOpenMeteoUtc,
  validationError,
} from "@/data/validation";
import type {
  DataPoint,
  WeatherDataset,
  WeatherForecastHour,
} from "@/types/domain";
import type { JsonFetcher } from "@/types/providers";

const SOURCE = "open-meteo-weather" as const;

const CURRENT_VARIABLES = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "cloud_cover",
  "is_day",
].join(",");

const HOURLY_VARIABLES = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "cloud_cover",
  "direct_radiation",
  "uv_index",
].join(",");

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

function modeledPoint<T>(
  value: T | null,
  validAt: string,
  fetchedAt: string,
): DataPoint<T> {
  return {
    value,
    validAt,
    fetchedAt,
    source: SOURCE,
    kind: "modeled",
  };
}

export function buildWeatherUrl(): string {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(BEACH.latitude));
  url.searchParams.set("longitude", String(BEACH.longitude));
  url.searchParams.set("current", CURRENT_VARIABLES);
  url.searchParams.set("hourly", HOURLY_VARIABLES);
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("forecast_days", String(BEACH.forecastDays));
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  return url.toString();
}

export function parseWeatherResponse(
  value: unknown,
  fetchedAt: string,
): WeatherDataset {
  const root = expectRecord(value, SOURCE, "weather response");

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
  const daily = expectRecord(root.daily, SOURCE, "daily");
  const dailyUnits = expectRecord(root.daily_units, SOURCE, "daily_units");

  expectUnit(currentUnits, "temperature_2m", "°C", "current_units");
  expectUnit(currentUnits, "wind_speed_10m", "km/h", "current_units");
  expectUnit(currentUnits, "wind_direction_10m", "°", "current_units");
  expectUnit(currentUnits, "wind_gusts_10m", "km/h", "current_units");
  expectUnit(currentUnits, "pressure_msl", "hPa", "current_units");
  expectUnit(currentUnits, "cloud_cover", "%", "current_units");
  expectUnit(hourlyUnits, "temperature_2m", "°C", "hourly_units");
  expectUnit(hourlyUnits, "wind_speed_10m", "km/h", "hourly_units");
  expectUnit(hourlyUnits, "wind_direction_10m", "°", "hourly_units");
  expectUnit(hourlyUnits, "wind_gusts_10m", "km/h", "hourly_units");
  expectUnit(hourlyUnits, "pressure_msl", "hPa", "hourly_units");
  expectUnit(hourlyUnits, "cloud_cover", "%", "hourly_units");
  expectUnit(hourlyUnits, "direct_radiation", "W/m²", "hourly_units");
  expectUnit(dailyUnits, "sunrise", "iso8601", "daily_units");
  expectUnit(dailyUnits, "sunset", "iso8601", "daily_units");

  const currentValidAt = parseOpenMeteoUtc(
    expectString(current.time, SOURCE, "current.time"),
    SOURCE,
    "current.time",
  );
  const currentIsDay = expectFiniteNumber(
    current.is_day,
    SOURCE,
    "current.is_day",
  );

  if (currentIsDay !== 0 && currentIsDay !== 1) {
    throw validationError(SOURCE, "current.is_day must be 0 or 1.");
  }

  const times = expectStringArray(hourly.time, SOURCE, "hourly.time");
  const temperature = expectNullableNumberArray(
    hourly.temperature_2m,
    SOURCE,
    "hourly.temperature_2m",
  );
  const windSpeed = expectNullableNumberArray(
    hourly.wind_speed_10m,
    SOURCE,
    "hourly.wind_speed_10m",
  );
  const windDirection = expectNullableNumberArray(
    hourly.wind_direction_10m,
    SOURCE,
    "hourly.wind_direction_10m",
  );
  const windGust = expectNullableNumberArray(
    hourly.wind_gusts_10m,
    SOURCE,
    "hourly.wind_gusts_10m",
  );
  const pressure = expectNullableNumberArray(
    hourly.pressure_msl,
    SOURCE,
    "hourly.pressure_msl",
  );
  const cloudCover = expectNullableNumberArray(
    hourly.cloud_cover,
    SOURCE,
    "hourly.cloud_cover",
  );
  const directRadiation = expectNullableNumberArray(
    hourly.direct_radiation,
    SOURCE,
    "hourly.direct_radiation",
  );
  const uvIndex = expectNullableNumberArray(
    hourly.uv_index,
    SOURCE,
    "hourly.uv_index",
  );

  const hourlySeries = [
    ["hourly.temperature_2m", temperature],
    ["hourly.wind_speed_10m", windSpeed],
    ["hourly.wind_direction_10m", windDirection],
    ["hourly.wind_gusts_10m", windGust],
    ["hourly.pressure_msl", pressure],
    ["hourly.cloud_cover", cloudCover],
    ["hourly.direct_radiation", directRadiation],
    ["hourly.uv_index", uvIndex],
  ] as const;

  for (const [path, series] of hourlySeries) {
    expectEqualLength(SOURCE, path, times.length, series);
  }

  const normalizedHourly: WeatherForecastHour[] = times.map((time, index) => ({
    validAt: parseOpenMeteoUtc(time, SOURCE, `hourly.time[${index}]`),
    airTemperatureC: temperature[index] ?? null,
    windSpeedKmh: windSpeed[index] ?? null,
    windDirectionDeg: windDirection[index] ?? null,
    windGustKmh: windGust[index] ?? null,
    pressureHpa: pressure[index] ?? null,
    cloudCoverPct: cloudCover[index] ?? null,
    directRadiationWm2: directRadiation[index] ?? null,
    uvIndex: uvIndex[index] ?? null,
  }));

  const dailyDates = expectStringArray(daily.time, SOURCE, "daily.time");
  const sunrises = expectStringArray(daily.sunrise, SOURCE, "daily.sunrise");
  const sunsets = expectStringArray(daily.sunset, SOURCE, "daily.sunset");
  expectEqualLength(SOURCE, "daily.sunrise", dailyDates.length, sunrises);
  expectEqualLength(SOURCE, "daily.sunset", dailyDates.length, sunsets);

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
      airTemperatureC: modeledPoint(
        expectNullableNumber(
          current.temperature_2m,
          SOURCE,
          "current.temperature_2m",
        ),
        currentValidAt,
        fetchedAt,
      ),
      windSpeedKmh: modeledPoint(
        expectNullableNumber(
          current.wind_speed_10m,
          SOURCE,
          "current.wind_speed_10m",
        ),
        currentValidAt,
        fetchedAt,
      ),
      windDirectionDeg: modeledPoint(
        expectNullableNumber(
          current.wind_direction_10m,
          SOURCE,
          "current.wind_direction_10m",
        ),
        currentValidAt,
        fetchedAt,
      ),
      windGustKmh: modeledPoint(
        expectNullableNumber(
          current.wind_gusts_10m,
          SOURCE,
          "current.wind_gusts_10m",
        ),
        currentValidAt,
        fetchedAt,
      ),
      pressureHpa: modeledPoint(
        expectNullableNumber(
          current.pressure_msl,
          SOURCE,
          "current.pressure_msl",
        ),
        currentValidAt,
        fetchedAt,
      ),
      cloudCoverPct: modeledPoint(
        expectNullableNumber(
          current.cloud_cover,
          SOURCE,
          "current.cloud_cover",
        ),
        currentValidAt,
        fetchedAt,
      ),
      isDay: modeledPoint(currentIsDay === 1, currentValidAt, fetchedAt),
    },
    hourly: normalizedHourly,
    solarDays: dailyDates.map((providerDate, index) => ({
      providerDate: parseCalendarDate(
        providerDate,
        SOURCE,
        `daily.time[${index}]`,
      ),
      sunriseAt: parseOpenMeteoUtc(
        sunrises[index] ?? "",
        SOURCE,
        `daily.sunrise[${index}]`,
      ),
      sunsetAt: parseOpenMeteoUtc(
        sunsets[index] ?? "",
        SOURCE,
        `daily.sunset[${index}]`,
      ),
    })),
  };
}

export async function fetchWeather(
  jsonFetcher: JsonFetcher = fetchJson,
): Promise<WeatherDataset> {
  const result = await jsonFetcher({
    provider: SOURCE,
    url: buildWeatherUrl(),
  });

  return parseWeatherResponse(result.data, result.fetchedAt);
}
