import {
  isMarineDataset,
  isTideDataset,
  isWeatherDataset,
} from "@/data/domain-guards";
import { isStrictIsoInstant } from "@/data/validation";
import type {
  IsoInstant,
  MarineDataset,
  TideDataset,
  WeatherDataset,
} from "@/types/domain";

export type CacheableSource =
  "open-meteo-weather" | "open-meteo-marine" | "noaa-tides";

export interface CacheDatasetBySource {
  "open-meteo-weather": WeatherDataset;
  "open-meteo-marine": MarineDataset;
  "noaa-tides": TideDataset;
}

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

function isDatasetForProvider<P extends CacheableSource>(
  value: unknown,
  provider: P,
): value is CacheDatasetBySource[P] {
  switch (provider) {
    case "open-meteo-weather":
      return isWeatherDataset(value);
    case "open-meteo-marine":
      return isMarineDataset(value);
    case "noaa-tides":
      return isTideDataset(value);
  }
}

function removeQuietly(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function readProviderCache<P extends CacheableSource>(
  provider: P,
  storage: StorageLike,
  now = new Date(),
): CachedValue<CacheDatasetBySource[P]> | null {
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
      !isStrictIsoInstant(parsed.fetchedAt) ||
      !isStrictIsoInstant(parsed.staleAt) ||
      !isStrictIsoInstant(parsed.expiresAt) ||
      !isDatasetForProvider(parsed.data, provider)
    ) {
      removeQuietly(storage, key);
      return null;
    }

    const policy = CACHE_POLICIES[provider];
    const fetchedAtMs = Date.parse(parsed.fetchedAt);
    const expectedStaleAt = new Date(
      fetchedAtMs + policy.staleAfterMs,
    ).toISOString();
    const expectedExpiresAt = new Date(
      fetchedAtMs + policy.expireAfterMs,
    ).toISOString();

    if (
      parsed.data.fetchedAt !== parsed.fetchedAt ||
      parsed.staleAt !== expectedStaleAt ||
      parsed.expiresAt !== expectedExpiresAt
    ) {
      removeQuietly(storage, key);
      return null;
    }

    if (now.getTime() >= Date.parse(parsed.expiresAt)) {
      removeQuietly(storage, key);
      return null;
    }

    return {
      data: parsed.data,
      fetchedAt: parsed.fetchedAt,
      freshness:
        now.getTime() >= Date.parse(parsed.staleAt) ? "stale" : "fresh",
    };
  } catch {
    removeQuietly(storage, key);
    return null;
  }
}

export function writeProviderCache<P extends CacheableSource>(
  provider: P,
  data: CacheDatasetBySource[P],
  fetchedAt: IsoInstant,
  storage: StorageLike,
): void {
  const policy = CACHE_POLICIES[provider];
  const fetchedAtMs = Date.parse(fetchedAt);

  if (
    !isStrictIsoInstant(fetchedAt) ||
    !isDatasetForProvider(data, provider) ||
    data.fetchedAt !== fetchedAt
  ) {
    return;
  }

  const envelope: CacheEnvelope<CacheDatasetBySource[P]> = {
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
