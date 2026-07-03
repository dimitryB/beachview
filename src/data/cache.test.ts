import {
  readProviderCache,
  type StorageLike,
  writeProviderCache,
} from "@/data/cache";
import { parseWeatherResponse } from "@/data/open-meteo-weather";
import { WEATHER_RESPONSE } from "@/test/fixtures/providers";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const fetchedAt = "2026-07-02T12:00:00.000Z";
const weather = parseWeatherResponse(WEATHER_RESPONSE, fetchedAt);

describe("provider cache", () => {
  it("reads a fresh versioned provider entry", () => {
    const storage = new MemoryStorage();
    writeProviderCache("open-meteo-weather", weather, fetchedAt, storage);

    const cached = readProviderCache<typeof weather>(
      "open-meteo-weather",
      storage,
      new Date("2026-07-02T12:15:00.000Z"),
    );

    expect(cached).toEqual({
      data: weather,
      fetchedAt,
      freshness: "fresh",
    });
  });

  it("marks an entry stale before its maximum fallback age", () => {
    const storage = new MemoryStorage();
    writeProviderCache("open-meteo-weather", weather, fetchedAt, storage);

    expect(
      readProviderCache(
        "open-meteo-weather",
        storage,
        new Date("2026-07-02T13:00:00.000Z"),
      )?.freshness,
    ).toBe("stale");
  });

  it("removes expired, corrupt, and incompatible entries", () => {
    const expiredStorage = new MemoryStorage();
    writeProviderCache(
      "open-meteo-weather",
      weather,
      fetchedAt,
      expiredStorage,
    );
    expect(
      readProviderCache(
        "open-meteo-weather",
        expiredStorage,
        new Date("2026-07-03T01:00:00.000Z"),
      ),
    ).toBeNull();
    expect(expiredStorage.values.size).toBe(0);

    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem("vabeachcast:provider:open-meteo-weather", "{");
    expect(readProviderCache("open-meteo-weather", corruptStorage)).toBeNull();

    const incompatibleStorage = new MemoryStorage();
    incompatibleStorage.setItem(
      "vabeachcast:provider:open-meteo-weather",
      JSON.stringify({
        schemaVersion: 1,
        provider: "open-meteo-weather",
        fetchedAt,
        staleAt: "2026-07-02T12:30:00.000Z",
        expiresAt: "2026-07-03T00:00:00.000Z",
        data: { source: "noaa-tides" },
      }),
    );
    expect(
      readProviderCache("open-meteo-weather", incompatibleStorage),
    ).toBeNull();
  });
});
