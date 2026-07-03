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

  it("finds shifts across the full six-hour span", () => {
    const hours = [
      weatherHour("2026-07-02T12:00:00.000Z", 350),
      weatherHour("2026-07-02T18:00:00.000Z", 80),
    ];

    expect(findMeaningfulWindShifts(hours)).toHaveLength(1);
  });

  it("detects a shift that completes within two hours", () => {
    const hours = [
      weatherHour("2026-07-02T12:00:00.000Z", 0),
      weatherHour("2026-07-02T13:00:00.000Z", 40),
      weatherHour("2026-07-02T14:00:00.000Z", 90),
    ];

    expect(findMeaningfulWindShifts(hours)).toEqual([
      expect.objectContaining({
        fromAt: "2026-07-02T12:00:00.000Z",
        toAt: "2026-07-02T14:00:00.000Z",
        fromDirection: "N",
        toDirection: "E",
        changeDeg: 90,
      }),
    ]);
  });

  it("merges a persistent frontal shift into one detection", () => {
    const hours: WeatherForecastHour[] = [];
    for (let hour = 6; hour <= 20; hour += 1) {
      hours.push(
        weatherHour(
          `2026-07-02T${String(hour).padStart(2, "0")}:00:00.000Z`,
          hour < 14 ? 350 : 80,
        ),
      );
    }

    const shifts = findMeaningfulWindShifts(hours);

    expect(shifts).toHaveLength(1);
    expect(shifts[0]).toMatchObject({
      fromDirection: "N",
      toDirection: "E",
      toAt: "2026-07-02T14:00:00.000Z",
    });
  });

  it("ignores gradual drift below the material threshold", () => {
    const hours = Array.from({ length: 10 }, (_, index) =>
      weatherHour(
        `2026-07-02T${String(6 + index).padStart(2, "0")}:00:00.000Z`,
        index * 7,
      ),
    );

    expect(findMeaningfulWindShifts(hours)).toEqual([]);
  });

  it("does not pair samples more than six hours apart", () => {
    const hours = [
      weatherHour("2026-07-02T12:00:00.000Z", 350),
      weatherHour("2026-07-02T19:00:00.000Z", 80),
    ];

    expect(findMeaningfulWindShifts(hours)).toEqual([]);
  });
});
