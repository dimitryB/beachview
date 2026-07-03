import { renderHook, waitFor } from "@testing-library/react";

import { writeProviderCache } from "@/data/cache";
import { ProviderError } from "@/data/fetch-json";
import { fetchNoaaTides, parseNoaaTidesResponse } from "@/data/noaa-tides";
import { fetchMarine, parseMarineResponse } from "@/data/open-meteo-marine";
import { fetchWeather, parseWeatherResponse } from "@/data/open-meteo-weather";
import { useBeachData } from "@/hooks/use-beach-data";
import {
  MARINE_RESPONSE,
  NOAA_RESPONSE,
  WEATHER_RESPONSE,
} from "@/test/fixtures/providers";

vi.mock("@/data/open-meteo-weather", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchWeather: vi.fn(),
}));
vi.mock("@/data/open-meteo-marine", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchMarine: vi.fn(),
}));
vi.mock("@/data/noaa-tides", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchNoaaTides: vi.fn(),
}));

const fetchedAt = new Date().toISOString();
const weather = parseWeatherResponse(WEATHER_RESPONSE, fetchedAt);
const marine = parseMarineResponse(MARINE_RESPONSE, fetchedAt);
const tides = parseNoaaTidesResponse(
  NOAA_RESPONSE,
  fetchedAt,
  new Date("2026-07-02T16:00:00.000Z"),
);

describe("useBeachData", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(fetchWeather).mockReset();
    vi.mocked(fetchMarine).mockReset();
    vi.mocked(fetchNoaaTides).mockReset();
  });

  it("keeps providers independent when one fails", async () => {
    vi.mocked(fetchWeather).mockResolvedValue(weather);
    vi.mocked(fetchMarine).mockRejectedValue(
      new ProviderError(
        "open-meteo-marine",
        "network",
        "Marine provider unavailable.",
      ),
    );
    vi.mocked(fetchNoaaTides).mockResolvedValue(tides);

    const { result } = renderHook(() => useBeachData());

    await waitFor(() => {
      expect(result.current.weather.status).toBe("fresh");
      expect(result.current.marine.status).toBe("error");
      expect(result.current.tides.status).toBe("fresh");
    });

    expect(result.current.weather.data).toBe(weather);
    expect(result.current.marine.data).toBeNull();
    expect(result.current.marine.error).toBe("Marine provider unavailable.");
    expect(result.current.tides.data).toBe(tides);
  });

  it("renders cached data before a refresh resolves", async () => {
    writeProviderCache(
      "open-meteo-weather",
      weather,
      fetchedAt,
      window.localStorage,
    );
    vi.mocked(fetchWeather).mockImplementation(() => new Promise(() => {}));
    vi.mocked(fetchMarine).mockImplementation(() => new Promise(() => {}));
    vi.mocked(fetchNoaaTides).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useBeachData());

    expect(result.current.weather.data).toEqual(weather);
    expect(result.current.weather.status).toBe("fresh");

    await waitFor(() => {
      expect(result.current.weather.isRefreshing).toBe(true);
    });
    expect(result.current.weather.data).toEqual(weather);
  });

  it("marks cached data stale when its refresh fails", async () => {
    writeProviderCache(
      "open-meteo-marine",
      marine,
      fetchedAt,
      window.localStorage,
    );
    vi.mocked(fetchWeather).mockResolvedValue(weather);
    vi.mocked(fetchMarine).mockRejectedValue(
      new ProviderError(
        "open-meteo-marine",
        "timeout",
        "Marine refresh timed out.",
      ),
    );
    vi.mocked(fetchNoaaTides).mockResolvedValue(tides);

    const { result } = renderHook(() => useBeachData());

    await waitFor(() => {
      expect(result.current.marine.status).toBe("stale");
    });

    expect(result.current.marine.data).toEqual(marine);
    expect(result.current.marine.error).toBe("Marine refresh timed out.");
  });
});
