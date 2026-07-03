import { findClosestWeatherHour } from "@/domain/weather";
import type { WeatherForecastHour } from "@/types/domain";

function weatherHour(validAt: string): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 25,
    windSpeedKmh: 12,
    windDirectionDeg: 180,
    windGustKmh: 18,
    pressureHpa: 1015,
    cloudCoverPct: 50,
    directRadiationWm2: 100,
    uvIndex: 2,
  };
}

describe("weather-hour selection", () => {
  it("selects the closest hour inside the configured tolerance", () => {
    const hour = weatherHour("2026-07-02T22:00:00.000Z");
    expect(
      findClosestWeatherHour(
        "2026-07-02T22:15:00.000Z",
        [weatherHour("2026-07-02T23:00:00.000Z"), hour],
        15,
      ),
    ).toBe(hour);
  });

  it("rejects distant, invalid, and negative-tolerance matches", () => {
    const hours = [weatherHour("2026-07-02T22:00:00.000Z")];
    expect(
      findClosestWeatherHour("2026-07-02T22:15:00.000Z", hours, 14),
    ).toBeNull();
    expect(findClosestWeatherHour("invalid", hours)).toBeNull();
    expect(
      findClosestWeatherHour("2026-07-02T22:00:00.000Z", hours, -1),
    ).toBeNull();
  });
});
