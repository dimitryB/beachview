import {
  calculatePressureTendencyAt,
  classifyPressureTendency,
} from "@/domain/pressure";
import type { WeatherForecastHour } from "@/types/domain";

function pressureHour(
  validAt: string,
  pressureHpa: number | null,
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 24,
    windSpeedKmh: 12,
    windDirectionDeg: 180,
    windGustKmh: 18,
    pressureHpa,
    cloudCoverPct: 50,
    directRadiationWm2: 100,
    uvIndex: 2,
  };
}

describe("pressure tendency", () => {
  it("classifies exact and adjacent threshold values", () => {
    expect(classifyPressureTendency(1)).toBe("rising");
    expect(classifyPressureTendency(0.999)).toBe("steady");
    expect(classifyPressureTendency(-0.999)).toBe("steady");
    expect(classifyPressureTendency(-1)).toBe("falling");
    expect(classifyPressureTendency(Number.NaN)).toBeNull();
  });

  it("uses the closest valid value about three hours earlier", () => {
    const result = calculatePressureTendencyAt(
      "2026-07-02T22:15:00.000Z",
      1017.5,
      [
        pressureHour("2026-07-02T18:00:00.000Z", 1015),
        pressureHour("2026-07-02T19:00:00.000Z", 1016.4),
        pressureHour("2026-07-02T20:00:00.000Z", 1017),
      ],
    );

    expect(result).toMatchObject({
      state: "rising",
      previousHpa: 1016.4,
      previousAt: "2026-07-02T19:00:00.000Z",
    });
    expect(result.changeHpa).toBeCloseTo(1.1);
    expect(result.label).toBe("Rising +1.1 hPa / 3 h");
  });

  it("returns unavailable when valid history is missing or too distant", () => {
    expect(
      calculatePressureTendencyAt("2026-07-02T22:00:00.000Z", 1017, [
        pressureHour("2026-07-02T16:00:00.000Z", 1015),
      ]).state,
    ).toBe("unavailable");
    expect(
      calculatePressureTendencyAt("2026-07-02T22:00:00.000Z", null, [
        pressureHour("2026-07-02T19:00:00.000Z", 1015),
      ]).state,
    ).toBe("unavailable");
  });
});
