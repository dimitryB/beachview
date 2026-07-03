import { isStrictCalendarDate, isStrictIsoInstant } from "@/data/validation";
import type {
  DataPoint,
  GridLocation,
  MarineDataset,
  MarineForecastHour,
  TideDataset,
  TideEvent,
  WeatherDataset,
  WeatherForecastHour,
} from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isGridLocation(value: unknown): value is GridLocation {
  return (
    isRecord(value) &&
    isFiniteNumber(value.requestedLatitude) &&
    isFiniteNumber(value.requestedLongitude) &&
    isFiniteNumber(value.returnedLatitude) &&
    isFiniteNumber(value.returnedLongitude)
  );
}

function isModeledPoint<T>(
  value: unknown,
  source: "open-meteo-weather" | "open-meteo-marine",
  fetchedAt: string,
  isValue: (candidate: unknown) => candidate is T,
): value is DataPoint<T> {
  return (
    isRecord(value) &&
    (value.value === null || isValue(value.value)) &&
    isStrictIsoInstant(value.validAt) &&
    value.fetchedAt === fetchedAt &&
    value.source === source &&
    value.kind === "modeled"
  );
}

function isWeatherForecastHour(value: unknown): value is WeatherForecastHour {
  return (
    isRecord(value) &&
    isStrictIsoInstant(value.validAt) &&
    isNullableFiniteNumber(value.airTemperatureC) &&
    isNullableFiniteNumber(value.windSpeedKmh) &&
    isNullableFiniteNumber(value.windDirectionDeg) &&
    isNullableFiniteNumber(value.windGustKmh) &&
    isNullableFiniteNumber(value.pressureHpa) &&
    isNullableFiniteNumber(value.cloudCoverPct) &&
    isNullableFiniteNumber(value.directRadiationWm2) &&
    isNullableFiniteNumber(value.uvIndex)
  );
}

function isMarineForecastHour(value: unknown): value is MarineForecastHour {
  return (
    isRecord(value) &&
    isStrictIsoInstant(value.validAt) &&
    isNullableFiniteNumber(value.waveHeightM) &&
    isNullableFiniteNumber(value.wavePeriodS) &&
    isNullableFiniteNumber(value.seaSurfaceTemperatureC)
  );
}

function isTideEvent(value: unknown): value is TideEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    (value.type === "high" || value.type === "low") &&
    isStrictIsoInstant(value.validAt) &&
    isStrictCalendarDate(value.localDate) &&
    isFiniteNumber(value.heightM) &&
    value.datum === "MLLW" &&
    value.source === "noaa-tides" &&
    value.kind === "predicted"
  );
}

export function isWeatherDataset(value: unknown): value is WeatherDataset {
  if (
    !isRecord(value) ||
    value.source !== "open-meteo-weather" ||
    !isStrictIsoInstant(value.fetchedAt) ||
    !isGridLocation(value.grid) ||
    !isRecord(value.current) ||
    !Array.isArray(value.hourly) ||
    !Array.isArray(value.solarDays)
  ) {
    return false;
  }

  const fetchedAt = value.fetchedAt;
  const current = value.current;

  return (
    isModeledPoint(
      current.airTemperatureC,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.windSpeedKmh,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.windDirectionDeg,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.windGustKmh,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.pressureHpa,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.cloudCoverPct,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.isDay,
      value.source,
      fetchedAt,
      (candidate): candidate is boolean => typeof candidate === "boolean",
    ) &&
    value.hourly.every(isWeatherForecastHour) &&
    value.solarDays.every(
      (day) =>
        isRecord(day) &&
        isStrictCalendarDate(day.providerDate) &&
        (day.sunriseAt === null || isStrictIsoInstant(day.sunriseAt)) &&
        (day.sunsetAt === null || isStrictIsoInstant(day.sunsetAt)),
    )
  );
}

export function isMarineDataset(value: unknown): value is MarineDataset {
  if (
    !isRecord(value) ||
    value.source !== "open-meteo-marine" ||
    !isStrictIsoInstant(value.fetchedAt) ||
    !isGridLocation(value.grid) ||
    !isRecord(value.current) ||
    !Array.isArray(value.hourly)
  ) {
    return false;
  }

  const fetchedAt = value.fetchedAt;
  const current = value.current;

  return (
    isModeledPoint(
      current.waveHeightM,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.wavePeriodS,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    isModeledPoint(
      current.seaSurfaceTemperatureC,
      value.source,
      fetchedAt,
      isFiniteNumber,
    ) &&
    value.hourly.every(isMarineForecastHour)
  );
}

export function isTideDataset(value: unknown): value is TideDataset {
  return (
    isRecord(value) &&
    value.source === "noaa-tides" &&
    isStrictIsoInstant(value.fetchedAt) &&
    typeof value.stationId === "string" &&
    value.stationId.length > 0 &&
    typeof value.stationName === "string" &&
    value.stationName.length > 0 &&
    value.datum === "MLLW" &&
    Array.isArray(value.events) &&
    value.events.length > 0 &&
    value.events.every(isTideEvent)
  );
}
