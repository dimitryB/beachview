import { ProviderError } from "@/data/fetch-json";
import { buildMarineUrl, parseMarineResponse } from "@/data/open-meteo-marine";
import { FETCHED_AT, MARINE_RESPONSE } from "@/test/fixtures/providers";

describe("Open-Meteo marine adapter", () => {
  it("builds the fixed metric sea-cell request", () => {
    const url = new URL(buildMarineUrl());

    expect(url.origin).toBe("https://marine-api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("36.6917");
    expect(url.searchParams.get("longitude")).toBe("-75.92");
    expect(url.searchParams.get("timezone")).toBe("GMT");
    expect(url.searchParams.get("length_unit")).toBe("metric");
    expect(url.searchParams.get("cell_selection")).toBe("sea");
    expect(url.searchParams.get("forecast_days")).toBe("10");
  });

  it("normalizes values and preserves the returned offshore grid", () => {
    const result = parseMarineResponse(MARINE_RESPONSE, FETCHED_AT);

    expect(result.grid).toEqual({
      requestedLatitude: 36.6917,
      requestedLongitude: -75.92,
      returnedLatitude: 36.708336,
      returnedLongitude: -75.87499,
    });
    expect(result.current.waveHeightM.value).toBe(0.48);
    expect(result.current.wavePeriodS.value).toBe(4.85);
    expect(result.current.seaSurfaceTemperatureC.value).toBe(25.7);
    expect(result.hourly[1]?.waveHeightM).toBeNull();
  });

  it("rejects differing hourly coverage", () => {
    const malformed = structuredClone(MARINE_RESPONSE);
    malformed.hourly.wave_period = [4.85];

    expect(() => parseMarineResponse(malformed, FETCHED_AT)).toThrow(
      ProviderError,
    );
  });
});
