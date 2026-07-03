import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  readProviderCache,
  writeProviderCache,
  type CacheDatasetBySource,
  type CacheableSource,
  type StorageLike,
} from "@/data/cache";
import { fetchJson, ProviderError } from "@/data/fetch-json";
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

function initialState<P extends CacheableSource>(
  provider: P,
): ProviderState<CacheDatasetBySource[P]> {
  const storage = browserStorage();
  const cached = storage ? readProviderCache(provider, storage) : null;

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

interface RefreshTracker {
  sequence: number;
  controller: AbortController | null;
  inFlight: Promise<void> | null;
}

function createTracker(): RefreshTracker {
  return { sequence: 0, controller: null, inFlight: null };
}

function fetchWeatherWithSignal(signal: AbortSignal): Promise<WeatherDataset> {
  return fetchWeather((request) => fetchJson({ ...request, signal }));
}

function fetchMarineWithSignal(signal: AbortSignal): Promise<MarineDataset> {
  return fetchMarine((request) => fetchJson({ ...request, signal }));
}

function fetchTidesWithSignal(signal: AbortSignal): Promise<TideDataset> {
  return fetchNoaaTides((request) => fetchJson({ ...request, signal }));
}

function refreshProvider<P extends CacheableSource>(
  provider: P,
  tracker: RefreshTracker,
  fetcher: (signal: AbortSignal) => Promise<CacheDatasetBySource[P]>,
  setState: Dispatch<SetStateAction<ProviderState<CacheDatasetBySource[P]>>>,
): Promise<void> {
  if (tracker.inFlight) {
    return tracker.inFlight;
  }

  tracker.sequence += 1;

  const requestId = tracker.sequence;
  const controller = new AbortController();
  tracker.controller = controller;

  setState(refreshingState);

  const request = (async () => {
    try {
      const data = await fetcher(controller.signal);

      if (requestId !== tracker.sequence) {
        return;
      }

      const storage = browserStorage();
      if (storage) {
        writeProviderCache(provider, data, data.fetchedAt, storage);
      }

      setState({
        status: "fresh",
        data,
        error: null,
        fetchedAt: data.fetchedAt,
        isRefreshing: false,
      });
    } catch (error) {
      if (requestId !== tracker.sequence) {
        return;
      }

      if (error instanceof ProviderError && error.code === "aborted") {
        return;
      }

      setState((previous) => failedState(previous, error));
    } finally {
      if (requestId === tracker.sequence) {
        tracker.controller = null;
        tracker.inFlight = null;
      }
    }
  })();

  tracker.inFlight = request;
  return request;
}

export interface BeachDataController extends BeachDataState {
  refreshAll: () => Promise<void>;
  refreshMarine: () => Promise<void>;
  refreshTides: () => Promise<void>;
  refreshWeather: () => Promise<void>;
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
  const weatherRequests = useRef<RefreshTracker>(createTracker());
  const marineRequests = useRef<RefreshTracker>(createTracker());
  const tideRequests = useRef<RefreshTracker>(createTracker());

  const refreshWeather = useCallback(
    () =>
      refreshProvider(
        "open-meteo-weather",
        weatherRequests.current,
        fetchWeatherWithSignal,
        setWeather,
      ),
    [],
  );

  const refreshMarine = useCallback(
    () =>
      refreshProvider(
        "open-meteo-marine",
        marineRequests.current,
        fetchMarineWithSignal,
        setMarine,
      ),
    [],
  );

  const refreshTides = useCallback(
    () =>
      refreshProvider(
        "noaa-tides",
        tideRequests.current,
        fetchTidesWithSignal,
        setTides,
      ),
    [],
  );

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
    refreshMarine,
    refreshTides,
    refreshWeather,
  };
}
