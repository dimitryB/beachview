import {
  CARDINAL_DIRECTIONS,
  circularDirectionDifference,
  degreesToCardinal,
  detectMeaningfulWindShift,
  findMeaningfulWindShifts,
  normalizeDegrees,
} from "@/domain/wind";
import type { WeatherForecastHour } from "@/types/domain";

function weatherHour(
  validAt: string,
  direction: number | null,
  speed = 12,
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 24,
    windSpeedKmh: speed,
    windDirectionDeg: direction,
    windGustKmh: speed + 5,
    pressureHpa: 1015,
    cloudCoverPct: 50,
    directRadiationWm2: 100,
    uvIndex: 2,
  };
}

describe("wind utilities", () => {
  it("normalizes finite degrees into a single turn", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(721)).toBe(1);
    expect(normalizeDegrees(Number.NaN)).toBeNull();
  });

  it("maps every 16-point sector and its clockwise boundary", () => {
    CARDINAL_DIRECTIONS.forEach((direction, index) => {
      expect(degreesToCardinal(index * 22.5)).toBe(direction);
      expect(degreesToCardinal(index * 22.5 + 11.249)).toBe(direction);
      expect(degreesToCardinal(index * 22.5 + 11.25)).toBe(
        CARDINAL_DIRECTIONS[(index + 1) % 16],
      );
    });
  });

  it("uses the shortest circular difference across north", () => {
    expect(circularDirectionDifference(350, 10)).toBe(20);
    expect(circularDirectionDifference(10, 350)).toBe(20);
    expect(circularDirectionDifference(0, 180)).toBe(180);
  });

  it("detects the exact material-shift and meaningful-speed boundaries", () => {
    const from = weatherHour("2026-07-02T12:00:00.000Z", 350, 8);
    const exact = weatherHour("2026-07-02T18:00:00.000Z", 35, 8);
    const belowAngle = weatherHour("2026-07-02T18:00:00.000Z", 34.9, 8);
    const calm = weatherHour("2026-07-02T18:00:00.000Z", 35, 7.9);

    expect(detectMeaningfulWindShift(from, exact)).toMatchObject({
      fromDirection: "N",
      toDirection: "NE",
      changeDeg: 45,
    });
    expect(detectMeaningfulWindShift(from, belowAngle)).toBeNull();
    expect(detectMeaningfulWindShift(from, calm)).toBeNull();
  });

  it("finds shifts approximately six hours apart", () => {
    const hours = [
      weatherHour("2026-07-02T12:00:00.000Z", 350),
      weatherHour("2026-07-02T18:00:00.000Z", 80),
    ];

    expect(findMeaningfulWindShifts(hours)).toHaveLength(1);
  });
});
