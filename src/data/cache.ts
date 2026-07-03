import type {
  IsoInstant,
  MarineDataset,
  TideDataset,
  WeatherDataset,
} from "@/types/domain";

export type CacheableSource =
  "open-meteo-weather" | "open-meteo-marine" | "noaa-tides";

export interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface CachePolicy {
  staleAfterMs: number;
  expireAfterMs: number;
}

interface CacheEnvelope<T> {
  schemaVersion: 1;
  provider: CacheableSource;
  fetchedAt: IsoInstant;
  staleAt: IsoInstant;
  expiresAt: IsoInstant;
  data: T;
}

export interface CachedValue<T> {
  data: T;
  fetchedAt: IsoInstant;
  freshness: "fresh" | "stale";
}

export const CACHE_POLICIES: Record<CacheableSource, CachePolicy> = {
  "open-meteo-weather": {
    staleAfterMs: 30 * 60 * 1_000,
    expireAfterMs: 12 * 60 * 60 * 1_000,
  },
  "open-meteo-marine": {
    staleAfterMs: 60 * 60 * 1_000,
    expireAfterMs: 12 * 60 * 60 * 1_000,
  },
  "noaa-tides": {
    staleAfterMs: 12 * 60 * 60 * 1_000,
    expireAfterMs: 36 * 60 * 60 * 1_000,
  },
};

const CACHE_SCHEMA_VERSION = 1;
const CACHE_PREFIX = "vabeachcast:provider";

function cacheKey(provider: CacheableSource): string {
  return `${CACHE_PREFIX}:${provider}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDatasetForProvider(
  value: unknown,
  provider: CacheableSource,
): value is WeatherDataset | MarineDataset | TideDataset {
  if (
    !isRecord(value) ||
    value.source !== provider ||
    !isIsoInstant(value.fetchedAt)
  ) {
    return false;
  }

  if (provider === "open-meteo-weather") {
    return (
      isRecord(value.grid) &&
      isRecord(value.current) &&
      Array.isArray(value.hourly) &&
      Array.isArray(value.solarDays)
    );
  }

  if (provider === "open-meteo-marine") {
    return (
      isRecord(value.grid) &&
      isRecord(value.current) &&
      Array.isArray(value.hourly)
    );
  }

  return (
    typeof value.stationId === "string" &&
    value.datum === "MLLW" &&
    Array.isArray(value.events)
  );
}

function isIsoInstant(value: unknown): value is IsoInstant {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function removeQuietly(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function readProviderCache<T>(
  provider: CacheableSource,
  storage: StorageLike,
  now = new Date(),
): CachedValue<T> | null {
  const key = cacheKey(provider);
  let raw: string | null;

  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== CACHE_SCHEMA_VERSION ||
      parsed.provider !== provider ||
      !isIsoInstant(parsed.fetchedAt) ||
      !isIsoInstant(parsed.staleAt) ||
      !isIsoInstant(parsed.expiresAt) ||
      !isDatasetForProvider(parsed.data, provider)
    ) {
      removeQuietly(storage, key);
      return null;
    }

    if (now.getTime() >= Date.parse(parsed.expiresAt)) {
      removeQuietly(storage, key);
      return null;
    }

    return {
      data: parsed.data as T,
      fetchedAt: parsed.fetchedAt,
      freshness:
        now.getTime() >= Date.parse(parsed.staleAt) ? "stale" : "fresh",
    };
  } catch {
    removeQuietly(storage, key);
    return null;
  }
}

export function writeProviderCache<T>(
  provider: CacheableSource,
  data: T,
  fetchedAt: IsoInstant,
  storage: StorageLike,
): void {
  const policy = CACHE_POLICIES[provider];
  const fetchedAtMs = Date.parse(fetchedAt);

  if (!Number.isFinite(fetchedAtMs)) {
    return;
  }

  const envelope: CacheEnvelope<T> = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    provider,
    fetchedAt,
    staleAt: new Date(fetchedAtMs + policy.staleAfterMs).toISOString(),
    expiresAt: new Date(fetchedAtMs + policy.expireAfterMs).toISOString(),
    data,
  };

  try {
    storage.setItem(cacheKey(provider), JSON.stringify(envelope));
  } catch {
    // Live data should still render when browser storage is unavailable.
  }
}

export function clearProviderCache(
  provider: CacheableSource,
  storage: StorageLike,
): void {
  removeQuietly(storage, cacheKey(provider));
}
