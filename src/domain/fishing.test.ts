import {
  buildFishingForecast,
  buildMovementWindows,
  calculateTideRanges,
  classifyMovementStrength,
  classifyShoreWind,
  estimatePeakRateMPerH,
  findSolunarOverlap,
  findTwilightOverlap,
} from "@/domain/fishing";
import type { SolunarPeriod } from "@/domain/moon";
import { SWIM_RULES } from "@/config/rules";
import { instantMilliseconds, localDateForInstant } from "@/domain/time";
import type {
  MarineForecastHour,
  OfficialAlert,
  SolarDay,
  TideEvent,
  WeatherForecastHour,
} from "@/types/domain";

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

function officialAlert(
  id: string,
  effectiveAt: string,
  expiresAt: string,
): OfficialAlert {
  return {
    id,
    headline: "High Surf Advisory",
    severity: "Moderate",
    effectiveAt,
    expiresAt,
    sourceUrl: "https://alerts.weather.gov/example",
    source: "nws-alerts",
    kind: "official-alert",
  };
}

function marineHour(
  validAt: string,
  overrides: Partial<MarineForecastHour> = {},
): MarineForecastHour {
  return {
    validAt,
    waveHeightM: 0.8,
    wavePeriodS: 8,
    seaSurfaceTemperatureC: 24,
    ...overrides,
  };
}

function solunarPeriod(
  kind: "major" | "minor",
  centerAt: string,
): SolunarPeriod {
  const centerMs = instantMilliseconds(centerAt) ?? 0;
  const halfWindowMs = (kind === "major" ? 60 : 30) * 60_000;
  return {
    kind,
    event: kind === "major" ? "overhead" : "moonrise",
    centerAt,
    startAt: new Date(centerMs - halfWindowMs).toISOString(),
    endAt: new Date(centerMs + halfWindowMs).toISOString(),
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

  it("uses the configured strong-wind threshold for candidates", () => {
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [],
      { ...SWIM_RULES, windStrongAtKmh: 20 },
    )[0];

    expect(window?.isCandidate).toBe(false);
    expect(window?.explanation).toContain("reaches");
  });

  it("does not call a window a candidate at the strong-gust boundary", () => {
    const window = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windGustKmh: 50,
        }),
      ],
    )[0];

    expect(window?.isCandidate).toBe(false);
    expect(window?.explanation).toContain("strong-gust threshold");
  });

  it("keeps a window a candidate just below the strong-gust boundary", () => {
    const window = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windGustKmh: 49.9,
        }),
      ],
    )[0];

    expect(window?.isCandidate).toBe(true);
    expect(window?.explanation).not.toContain("strong-gust threshold");
  });

  it("does not call a window a candidate when the gust is unavailable", () => {
    const window = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windGustKmh: null,
        }),
      ],
    )[0];

    expect(window?.isCandidate).toBe(false);
    expect(window?.explanation).toContain("gust is unavailable");
  });

  it("disqualifies a window that overlaps an official alert", () => {
    // The movement window spans 14:00–16:00 around the 15:00 midpoint.
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [
        officialAlert(
          "surf",
          "2026-07-02T14:30:00.000Z",
          "2026-07-02T17:00:00.000Z",
        ),
      ],
    )[0];

    expect(window?.isCandidate).toBe(false);
    expect(window?.explanation).toContain("official alert");
    expect(window?.explanation).toContain("High Surf Advisory");
  });

  it("ignores an alert that expired before the window starts", () => {
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [
        officialAlert(
          "expired",
          "2026-07-02T08:00:00.000Z",
          "2026-07-02T13:00:00.000Z",
        ),
      ],
    )[0];

    expect(window?.isCandidate).toBe(true);
    expect(window?.explanation).not.toContain("official alert");
  });

  it("ignores an alert that does not overlap the window", () => {
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [
        officialAlert(
          "later",
          "2026-07-02T17:00:00.000Z",
          "2026-07-02T20:00:00.000Z",
        ),
      ],
    )[0];

    expect(window?.isCandidate).toBe(true);
    expect(window?.explanation).not.toContain("official alert");
  });

  it("reports a persistent frontal wind shift as one timeline entry", () => {
    const weather: WeatherForecastHour[] = [];
    for (let hour = 6; hour <= 20; hour += 1) {
      weather.push(
        weatherHour(`2026-07-02T${String(hour).padStart(2, "0")}:00:00.000Z`, {
          windDirectionDeg: hour < 14 ? 350 : 80,
        }),
      );
    }

    const forecast = buildFishingForecast(
      [],
      weather,
      "2026-07-02T06:00:00.000Z",
    );
    const shiftEntries = forecast
      .flatMap((day) => day.timeline)
      .filter((entry) => entry.kind === "wind-shift");

    expect(shiftEntries).toHaveLength(1);
    expect(shiftEntries[0]?.validAt).toBe("2026-07-02T14:00:00.000Z");
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

  it("grades movement strength from the estimated peak rate", () => {
    // 1 m over 6 h peaks at π / 12 ≈ 0.26 m/h.
    expect(estimatePeakRateMPerH(1, 6 * 60 * 60 * 1_000)).toBeCloseTo(
      0.2618,
      3,
    );
    expect(classifyMovementStrength(0.17)).toBe("weak");
    expect(classifyMovementStrength(0.18)).toBe("moderate");
    expect(classifyMovementStrength(0.28)).toBe("strong");

    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
    )[0];
    expect(window?.peakRateMPerH).toBeCloseTo(0.2618, 3);
    expect(window?.strength).toBe("moderate");
  });

  it("classifies modeled wind against the east-facing shore", () => {
    expect(classifyShoreWind(90)).toBe("onshore");
    expect(classifyShoreWind(45)).toBe("onshore");
    expect(classifyShoreWind(270)).toBe("offshore");
    expect(classifyShoreWind(225)).toBe("offshore");
    expect(classifyShoreWind(0)).toBe("alongshore");
    expect(classifyShoreWind(180)).toBe("alongshore");
    expect(classifyShoreWind(Number.NaN)).toBeNull();

    // The fixture wind blows from 180° (S), alongshore for a 90° beach.
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
    )[0];
    expect(window?.shoreWind).toBe("alongshore");
  });

  it("attaches the closest modeled wave height when marine data exists", () => {
    const withMarine = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [],
      SWIM_RULES,
      { marineHours: [marineHour("2026-07-02T15:00:00.000Z")] },
    )[0];
    expect(withMarine?.waveHeightM).toBe(0.8);

    const outsideTolerance = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [],
      SWIM_RULES,
      { marineHours: [marineHour("2026-07-02T20:00:00.000Z")] },
    )[0];
    expect(outsideTolerance?.waveHeightM).toBeNull();

    const withoutMarine = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
    )[0];
    expect(withoutMarine?.waveHeightM).toBeNull();
  });

  it("flags dawn or dusk overlap using provided solar days", () => {
    const solarDay: SolarDay = {
      providerDate: "2026-07-02",
      sunriseAt: "2026-07-02T09:50:00.000Z",
      sunsetAt: "2026-07-02T16:30:00.000Z",
    };
    // The movement window spans 14:00–16:00Z; sunset ± 60 min overlaps.
    expect(
      findTwilightOverlap(
        instantMilliseconds("2026-07-02T14:00:00.000Z") ?? 0,
        instantMilliseconds("2026-07-02T16:00:00.000Z") ?? 0,
        [solarDay],
      ),
    ).toBe("dusk");
    expect(
      findTwilightOverlap(
        instantMilliseconds("2026-07-02T09:00:00.000Z") ?? 0,
        instantMilliseconds("2026-07-02T10:00:00.000Z") ?? 0,
        [solarDay],
      ),
    ).toBe("dawn");
    expect(
      findTwilightOverlap(
        instantMilliseconds("2026-07-02T12:00:00.000Z") ?? 0,
        instantMilliseconds("2026-07-02T13:00:00.000Z") ?? 0,
        [solarDay],
      ),
    ).toBeNull();

    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      [],
      SWIM_RULES,
      { solarDays: [solarDay] },
    )[0];
    expect(window?.twilightOverlap).toBe("dusk");
  });

  it("prefers a solunar major overlap over a minor one", () => {
    const startMs = instantMilliseconds("2026-07-02T14:00:00.000Z") ?? 0;
    const endMs = instantMilliseconds("2026-07-02T16:00:00.000Z") ?? 0;
    expect(
      findSolunarOverlap(startMs, endMs, [
        solunarPeriod("minor", "2026-07-02T14:15:00.000Z"),
        solunarPeriod("major", "2026-07-02T15:30:00.000Z"),
      ]),
    ).toBe("major");
    expect(
      findSolunarOverlap(startMs, endMs, [
        solunarPeriod("minor", "2026-07-02T14:15:00.000Z"),
      ]),
    ).toBe("minor");
    expect(
      findSolunarOverlap(startMs, endMs, [
        solunarPeriod("major", "2026-07-02T20:00:00.000Z"),
      ]),
    ).toBeNull();
  });

  it("keeps context signals informational for candidacy", () => {
    // Strong wind still disqualifies even with favorable context.
    const window = buildMovementWindows(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z", { windSpeedKmh: 40 })],
      [],
      SWIM_RULES,
      {
        marineHours: [marineHour("2026-07-02T15:00:00.000Z")],
        solunarPeriods: [solunarPeriod("major", "2026-07-02T15:00:00.000Z")],
      },
    )[0];
    expect(window?.solunarOverlap).toBe("major");
    expect(window?.isCandidate).toBe(false);
  });

  it("focuses strong candidates with cleaner wind", () => {
    const strongHigh = tideEvent(
      "strong-high",
      "high",
      "2026-07-02T18:00:00.000Z",
      1.35,
    );
    const window = buildMovementWindows(
      [low, strongHigh],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windSpeedKmh: 12,
          windGustKmh: 18,
          windDirectionDeg: 270,
        }),
      ],
    )[0];

    expect(window?.isCandidate).toBe(true);
    expect(window?.strength).toBe("strong");
    expect(window?.focus).toEqual({
      level: "strong",
      label: "Focused candidate",
      reasons: [
        "strong estimated tide movement",
        "wind below warning thresholds",
        "offshore wind",
      ],
    });
  });

  it("requires extra context before focusing moderate candidates", () => {
    const ordinary = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windSpeedKmh: 12,
          windGustKmh: 18,
        }),
      ],
    )[0];
    expect(ordinary?.isCandidate).toBe(true);
    expect(ordinary?.strength).toBe("moderate");
    expect(ordinary?.focus).toBeNull();

    const focused = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windSpeedKmh: 12,
          windGustKmh: 18,
        }),
      ],
      [],
      SWIM_RULES,
      {
        solunarPeriods: [solunarPeriod("major", "2026-07-02T15:00:00.000Z")],
      },
    )[0];
    expect(focused?.focus).toEqual(
      expect.objectContaining({
        level: "context",
        reasons: expect.arrayContaining([
          "moderate estimated tide movement",
          "wind below warning thresholds",
          "major solunar overlap",
        ]),
      }),
    );
  });

  it("keeps windy candidates out of the focused set", () => {
    const window = buildMovementWindows(
      [low, high],
      [
        weatherHour("2026-07-02T15:00:00.000Z", {
          windSpeedKmh: 25,
          windGustKmh: 32,
        }),
      ],
      [],
      SWIM_RULES,
      {
        solunarPeriods: [solunarPeriod("major", "2026-07-02T15:00:00.000Z")],
      },
    )[0];

    expect(window?.isCandidate).toBe(true);
    expect(window?.focus).toBeNull();
  });

  it("attaches a derived moon phase to each forecast day", () => {
    const forecast = buildFishingForecast(
      [low, high],
      [weatherHour("2026-07-02T15:00:00.000Z")],
      "2026-07-02T12:00:00.000Z",
    );
    expect(forecast[0]?.moonPhase).not.toBeNull();
    expect(forecast[0]?.moonPhase?.illuminationPct).toBeGreaterThanOrEqual(0);
    expect(forecast[0]?.moonPhase?.illuminationPct).toBeLessThanOrEqual(100);
    // Movement windows built through the full forecast get solunar context.
    const movement = forecast[0]?.movementWindows[0];
    expect(movement).toBeDefined();
    expect([null, "major", "minor"]).toContain(movement?.solunarOverlap);
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
