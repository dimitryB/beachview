import { useCallback, useEffect, useRef, useState } from "react";

import {
  readProviderCache,
  writeProviderCache,
  type CacheableSource,
  type StorageLike,
} from "@/data/cache";
import { ProviderError } from "@/data/fetch-json";
import { fetchNoaaTides } from "@/data/noaa-tides";
import { fetchMarine } from "@/data/open-meteo-marine";
import { fetchWeather } from "@/data/open-meteo-weather";
import type {
  BeachDataState,
  MarineDataset,
  ProviderState,
  TideDataset,
  WeatherDataset,
} from "@/types/domain";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function initialState<T>(provider: CacheableSource): ProviderState<T> {
  const storage = browserStorage();
  const cached = storage ? readProviderCache<T>(provider, storage) : null;

  if (!cached) {
    return {
      status: "loading",
      data: null,
      error: null,
      fetchedAt: null,
      isRefreshing: false,
    };
  }

  return {
    status: cached.freshness,
    data: cached.data,
    error: null,
    fetchedAt: cached.fetchedAt,
    isRefreshing: false,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ProviderError) {
    return error.message;
  }

  return "The provider could not be refreshed.";
}

function refreshingState<T>(previous: ProviderState<T>): ProviderState<T> {
  return {
    ...previous,
    status: previous.data ? previous.status : "loading",
    error: null,
    isRefreshing: true,
  };
}

function failedState<T>(
  previous: ProviderState<T>,
  error: unknown,
): ProviderState<T> {
  return {
    ...previous,
    status: previous.data ? "stale" : "error",
    error: errorMessage(error),
    isRefreshing: false,
  };
}

export interface BeachDataController extends BeachDataState {
  refreshAll: () => Promise<void>;
}

export function useBeachData(): BeachDataController {
  const [weather, setWeather] = useState<ProviderState<WeatherDataset>>(() =>
    initialState("open-meteo-weather"),
  );
  const [marine, setMarine] = useState<ProviderState<MarineDataset>>(() =>
    initialState("open-meteo-marine"),
  );
  const [tides, setTides] = useState<ProviderState<TideDataset>>(() =>
    initialState("noaa-tides"),
  );
  const started = useRef(false);

  const refreshWeather = useCallback(async () => {
    setWeather(refreshingState);

    try {
      const data = await fetchWeather();
      const storage = browserStorage();
      if (storage) {
        writeProviderCache(data.source, data, data.fetchedAt, storage);
      }
      setWeather({
        status: "fresh",
        data,
        error: null,
        fetchedAt: data.fetchedAt,
        isRefreshing: false,
      });
    } catch (error) {
      setWeather((previous) => failedState(previous, error));
    }
  }, []);

  const refreshMarine = useCallback(async () => {
    setMarine(refreshingState);

    try {
      const data = await fetchMarine();
      const storage = browserStorage();
      if (storage) {
        writeProviderCache(data.source, data, data.fetchedAt, storage);
      }
      setMarine({
        status: "fresh",
        data,
        error: null,
        fetchedAt: data.fetchedAt,
        isRefreshing: false,
      });
    } catch (error) {
      setMarine((previous) => failedState(previous, error));
    }
  }, []);

  const refreshTides = useCallback(async () => {
    setTides(refreshingState);

    try {
      const data = await fetchNoaaTides();
      const storage = browserStorage();
      if (storage) {
        writeProviderCache(data.source, data, data.fetchedAt, storage);
      }
      setTides({
        status: "fresh",
        data,
        error: null,
        fetchedAt: data.fetchedAt,
        isRefreshing: false,
      });
    } catch (error) {
      setTides((previous) => failedState(previous, error));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refreshWeather(),
      refreshMarine(),
      refreshTides(),
    ]);
  }, [refreshMarine, refreshTides, refreshWeather]);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    void refreshAll();
  }, [refreshAll]);

  return {
    weather,
    marine,
    tides,
    refreshAll,
  };
}
