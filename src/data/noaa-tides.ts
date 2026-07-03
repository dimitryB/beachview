import { BEACH } from "@/config/location";
import { fetchJson, ProviderError } from "@/data/fetch-json";
import {
  expectArray,
  expectRecord,
  expectString,
  parseNoaaUtc,
  validationError,
} from "@/data/validation";
import type { TideDataset, TideEvent, TideEventType } from "@/types/domain";
import type { JsonFetcher } from "@/types/providers";

const SOURCE = "noaa-tides" as const;
const DAY_MS = 24 * 60 * 60 * 1_000;

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function localDateForInstant(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEACH.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addCalendarDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const result = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function buildNoaaTidesUrl(now = new Date()): string {
  const url = new URL(
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  );
  url.searchParams.set(
    "begin_date",
    formatUtcDate(new Date(now.getTime() - DAY_MS)),
  );
  url.searchParams.set(
    "end_date",
    formatUtcDate(new Date(now.getTime() + (BEACH.forecastDays + 1) * DAY_MS)),
  );
  url.searchParams.set("station", BEACH.noaaTideStation);
  url.searchParams.set("product", "predictions");
  url.searchParams.set("datum", BEACH.noaaTideDatum);
  url.searchParams.set("time_zone", "gmt");
  url.searchParams.set("interval", "hilo");
  url.searchParams.set("units", "metric");
  url.searchParams.set("application", "VABeachCast");
  url.searchParams.set("format", "json");
  return url.toString();
}

export function parseNoaaTidesResponse(
  value: unknown,
  fetchedAt: string,
  now = new Date(),
): TideDataset {
  const root = expectRecord(value, SOURCE, "NOAA response");

  if (root.error !== undefined) {
    const error = expectRecord(root.error, SOURCE, "NOAA error");
    const message =
      typeof error.message === "string"
        ? error.message
        : "NOAA returned an unknown error.";
    throw new ProviderError(SOURCE, "validation", message);
  }

  const predictions = expectArray(root.predictions, SOURCE, "predictions");
  const todayLocal = localDateForInstant(now.toISOString());
  const firstLocalDate = addCalendarDays(todayLocal, -1);
  const endLocalDateExclusive = addCalendarDays(
    todayLocal,
    BEACH.forecastDays + 1,
  );

  const events: TideEvent[] = predictions
    .map((prediction, index) => {
      const record = expectRecord(prediction, SOURCE, `predictions[${index}]`);
      const rawTime = expectString(record.t, SOURCE, `predictions[${index}].t`);
      const rawHeight = expectString(
        record.v,
        SOURCE,
        `predictions[${index}].v`,
      );
      const rawType = expectString(
        record.type,
        SOURCE,
        `predictions[${index}].type`,
      );
      const heightM = Number(rawHeight);

      if (!Number.isFinite(heightM)) {
        throw validationError(
          SOURCE,
          `predictions[${index}].v must be a metric number.`,
        );
      }

      let type: TideEventType;
      if (rawType === "H") {
        type = "high";
      } else if (rawType === "L") {
        type = "low";
      } else {
        throw validationError(
          SOURCE,
          `predictions[${index}].type must be H or L.`,
        );
      }

      const validAt = parseNoaaUtc(rawTime, SOURCE, `predictions[${index}].t`);
      const localDate = localDateForInstant(validAt);

      return {
        id: `${validAt}-${type}`,
        type,
        validAt,
        localDate,
        heightM,
        datum: BEACH.noaaTideDatum,
        source: SOURCE,
        kind: "predicted" as const,
      };
    })
    .filter(
      (event) =>
        event.localDate >= firstLocalDate &&
        event.localDate < endLocalDateExclusive,
    )
    .sort((left, right) => left.validAt.localeCompare(right.validAt));

  if (events.length === 0) {
    throw validationError(SOURCE, "NOAA returned no usable tide predictions.");
  }

  return {
    source: SOURCE,
    fetchedAt,
    stationId: BEACH.noaaTideStation,
    stationName: "Sandbridge",
    datum: BEACH.noaaTideDatum,
    events,
  };
}

export async function fetchNoaaTides(
  jsonFetcher: JsonFetcher = fetchJson,
  now = new Date(),
): Promise<TideDataset> {
  const result = await jsonFetcher({
    provider: SOURCE,
    url: buildNoaaTidesUrl(now),
  });

  return parseNoaaTidesResponse(result.data, result.fetchedAt, now);
}
