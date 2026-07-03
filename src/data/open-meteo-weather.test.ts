import { ProviderError } from "@/data/fetch-json";
import {
  buildWeatherUrl,
  parseWeatherResponse,
} from "@/data/open-meteo-weather";
import { FETCHED_AT, WEATHER_RESPONSE } from "@/test/fixtures/providers";

describe("Open-Meteo weather adapter", () => {
  it("builds the fixed metric Sandbridge request", () => {
    const url = new URL(buildWeatherUrl());

    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("36.6917");
    expect(url.searchParams.get("longitude")).toBe("-75.92");
    expect(url.searchParams.get("timezone")).toBe("GMT");
    expect(url.searchParams.get("temperature_unit")).toBe("celsius");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("forecast_days")).toBe("10");
  });

  it("normalizes current, hourly, and solar data", () => {
    const result = parseWeatherResponse(WEATHER_RESPONSE, FETCHED_AT);

    expect(result.source).toBe("open-meteo-weather");
    expect(result.grid.returnedLatitude).toBe(36.66708);
    expect(result.current.airTemperatureC).toMatchObject({
      value: 31.8,
      validAt: "2026-07-02T22:15:00.000Z",
      kind: "modeled",
    });
    expect(result.hourly).toHaveLength(2);
    expect(result.hourly[1]?.airTemperatureC).toBeNull();
    expect(result.solarDays[0]).toEqual({
      providerDate: "2026-07-02",
      sunriseAt: "2026-07-02T09:49:00.000Z",
      sunsetAt: "2026-07-03T00:26:00.000Z",
    });
  });

  it("rejects mismatched hourly series", () => {
    const malformed = structuredClone(WEATHER_RESPONSE);
    malformed.hourly.wind_speed_10m = [18.5];

    expect(() => parseWeatherResponse(malformed, FETCHED_AT)).toThrow(
      ProviderError,
    );
  });

  it("surfaces provider error objects", () => {
    expect(() =>
      parseWeatherResponse(
        { error: true, reason: "Invalid variable." },
        FETCHED_AT,
      ),
    ).toThrow("Open-Meteo: Invalid variable.");
  });
});
