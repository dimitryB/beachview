import {
  buildFishingForecast,
  buildMovementWindows,
  calculateTideRanges,
} from "@/domain/fishing";
import { localDateForInstant } from "@/domain/time";
import type { TideEvent, WeatherForecastHour } from "@/types/domain";

function tideEvent(
  id: string,
  type: "high" | "low",
  validAt: string,
  heightM: number,
): TideEvent {
  return {
    id,
    type,
    validAt,
    localDate: localDateForInstant(validAt) ?? "",
    heightM,
    datum: "MLLW",
    source: "noaa-tides",
    kind: "predicted",
  };
}

function weatherHour(
  validAt: string,
  overrides: Partial<WeatherForecastHour> = {},
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 25,
    windSpeedKmh: 20,
    windDirectionDeg: 180,
    windGustKmh: 28,
    pressureHpa: 1015,
    cloudCoverPct: 50,
    directRadiationWm2: 100,
    uvIndex: 2,
    ...overrides,
  };
}

const low = tideEvent("low", "low", "2026-07-02T12:00:00.000Z", 0.1);
const high = tideEvent("high", "high", "2026-07-02T18:00:00.000Z", 1.1);

describe("fishing signals", () => {
  it("calculates adjacent tide ranges and direction", () => {
    expect(calculateTideRanges([high, low])).toEqual([
      expect.objectContaining({
        fromEvent: low,
        toEvent: high,
        rangeM: 1,
        direction: "incoming",
      }),
    ]);
  });

  it("centers stronger-movement windows and attaches modeled inputs", () => {
    const windows = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T12:00:00.000Z", {
          pressureHpa: 1013.5,
        }),
        weatherHour("2026-07-02T15:00:00.000Z", {
          pressureHpa: 1015,
        }),
      ],
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      midpointAt: "2026-07-02T15:00:00.000Z",
      startAt: "2026-07-02T14:00:00.000Z",
      endAt: "2026-07-02T16:00:00.000Z",
      direction: "incoming",
      rangeM: 1,
      windSpeedKmh: 20,
      windGustKmh: 28,
      windDirection: "S",
      isCandidate: true,
      label: "Stronger estimated tidal movement",
      pressureTendency: expect.objectContaining({
        state: "rising",
        changeHpa: 1.5,
      }),
    });
    expect(windows[0]?.explanation).toContain("Estimated incoming");
  });

  it("does not call a window a candidate at the strong-wind boundary", () => {
    const window = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windSpeedKmh: 35,
        }),
      ],
    )[0];

    expect(window?.isCandidate).toBe(false);
    expect(window?.explanation).toContain("reaches");
  });

  it("generates a chronological daily timeline", () => {
    const forecast = buildFishingForecast(
      [high, low],
      [
        weatherHour("2026-07-02T12:00:00.000Z", {
          windDirectionDeg: 0,
        }),
        weatherHour("2026-07-02T15:00:00.000Z"),
        weatherHour("2026-07-02T18:00:00.000Z", {
          windDirectionDeg: 90,
        }),
      ],
      "2026-07-02T12:00:00.000Z",
    );

    expect(forecast).toHaveLength(1);
    expect(forecast[0]?.timeline.map((entry) => entry.validAt)).toEqual(
      [...(forecast[0]?.timeline ?? [])].map((entry) => entry.validAt).sort(),
    );
    expect(forecast[0]?.maximumTideRangeM).toBe(1);
    expect(forecast[0]?.timeline.map((entry) => entry.kind)).toContain(
      "movement",
    );
  });

  it("limits stable daily output to ten Eastern dates", () => {
    const events: TideEvent[] = [];
    for (let index = 0; index < 22; index += 1) {
      const validAt = new Date(Date.UTC(2026, 6, 1, index * 12)).toISOString();
      events.push(
        tideEvent(
          `event-${index}`,
          index % 2 === 0 ? "low" : "high",
          validAt,
          index % 2 === 0 ? 0.1 : 1,
        ),
      );
    }

    const forecast = buildFishingForecast(
      events,
      [],
      "2026-07-01T12:00:00.000Z",
    );
    expect(forecast).toHaveLength(10);
    expect(forecast.map((day) => day.localDate)).toEqual(
      [...forecast.map((day) => day.localDate)].sort(),
    );
    expect(
      forecast
        .flatMap((day) => day.timeline)
        .every((entry) => !entry.label.toLowerCase().includes("optimal")),
    ).toBe(true);
  });
});
