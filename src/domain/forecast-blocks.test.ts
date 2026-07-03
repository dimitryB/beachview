import {
  buildSwimmingForecast,
  findBestLateDayWindow,
} from "@/domain/forecast-blocks";
import type {
  MarineForecastHour,
  SolarDay,
  WeatherForecastHour,
} from "@/types/domain";

function weatherHour(
  validAt: string,
  overrides: Partial<WeatherForecastHour> = {},
): WeatherForecastHour {
  return {
    validAt,
    airTemperatureC: 26,
    windSpeedKmh: 14,
    windDirectionDeg: 180,
    windGustKmh: 24,
    pressureHpa: 1015,
    cloudCoverPct: 30,
    directRadiationWm2: 150,
    uvIndex: 2,
    ...overrides,
  };
}

function marineHour(
  validAt: string,
  overrides: Partial<MarineForecastHour> = {},
): MarineForecastHour {
  return {
    validAt,
    waveHeightM: 0.5,
    wavePeriodS: 8,
    seaSurfaceTemperatureC: 25,
    ...overrides,
  };
}

function solarDay(providerDate: string, sunsetAt: string): SolarDay {
  return {
    providerDate,
    sunriseAt: null,
    sunsetAt,
  };
}

const localDate = "2026-07-02";
// July sunset at 20:30 EDT is 00:30 UTC of the next day, so the GMT-keyed
// provider day containing this sunset instant is 2026-07-03.
const sunset = solarDay("2026-07-03", "2026-07-03T00:30:00.000Z");

describe("late-day swimming forecast", () => {
  it("selects the longest passing sequence and keeps warnings explainable", () => {
    const times = [
      "2026-07-02T19:00:00.000Z",
      "2026-07-02T20:00:00.000Z",
      "2026-07-02T21:00:00.000Z",
      "2026-07-02T22:00:00.000Z",
    ];
    const weather = times.map((time, index) =>
      weatherHour(time, index === 3 ? { windSpeedKmh: 20 } : {}),
    );
    const marine = times.map((time, index) =>
      marineHour(time, {
        seaSurfaceTemperatureC: 25 + index / 10,
      }),
    );

    const window = findBestLateDayWindow(localDate, weather, marine, sunset);

    expect(window).toMatchObject({
      startAt: "2026-07-02T19:00:00.000Z",
      endAt: "2026-07-02T22:00:00.000Z",
      waterTemperatureC: 25.1,
      maxWaveHeightM: 0.5,
      maxWindSpeedKmh: 14,
      label: "Matches configured swim preferences",
    });
    expect(window?.nonBlockingWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Warm-water alert" }),
      ]),
    );
    expect(window?.explanation.toLowerCase()).not.toContain("safe");
  });

  it("uses the earlier start to break equal-duration ties", () => {
    const times = [
      "2026-07-02T19:00:00.000Z",
      "2026-07-02T20:00:00.000Z",
      "2026-07-02T21:00:00.000Z",
      "2026-07-02T22:00:00.000Z",
      "2026-07-02T23:00:00.000Z",
    ];
    const weather = times.map((time, index) =>
      weatherHour(time, index === 2 ? { windGustKmh: 30 } : {}),
    );
    const marine = times.map((time) => marineHour(time));

    expect(
      findBestLateDayWindow(localDate, weather, marine, sunset)?.startAt,
    ).toBe("2026-07-02T19:00:00.000Z");
  });

  it("rejects incomplete, choppy, and wind-warning hours", () => {
    const times = ["2026-07-02T19:00:00.000Z", "2026-07-02T20:00:00.000Z"];

    expect(
      findBestLateDayWindow(
        localDate,
        times.map((time) => weatherHour(time)),
        times.map((time) => marineHour(time, { wavePeriodS: 6.9 })),
        sunset,
      ),
    ).toBeNull();
    expect(
      findBestLateDayWindow(
        localDate,
        times.map((time) => weatherHour(time)),
        times.map((time, index) =>
          marineHour(time, {
            wavePeriodS: index === 0 ? Number.NaN : 8,
          }),
        ),
        sunset,
      ),
    ).toBeNull();
    expect(
      findBestLateDayWindow(
        localDate,
        times.map((time) => weatherHour(time)),
        times.map((time, index) =>
          marineHour(time, { wavePeriodS: index === 0 ? null : 8 }),
        ),
        sunset,
      ),
    ).toBeNull();
    expect(
      findBestLateDayWindow(
        localDate,
        times.map((time) => weatherHour(time, { windSpeedKmh: 20 })),
        times.map((time) => marineHour(time)),
        sunset,
      ),
    ).toBeNull();
  });

  it("applies every lower-exposure boundary inclusively", () => {
    const times = ["2026-07-02T19:00:00.000Z", "2026-07-02T20:00:00.000Z"];
    const marine = times.map((time) => marineHour(time));
    const hasWindow = (overrides: Partial<WeatherForecastHour>) =>
      findBestLateDayWindow(
        localDate,
        times.map((time) => weatherHour(time, overrides)),
        marine,
        sunset,
      ) !== null;

    expect(
      hasWindow({
        uvIndex: 3,
        directRadiationWm2: 201,
        cloudCoverPct: 69,
      }),
    ).toBe(true);
    expect(
      hasWindow({
        uvIndex: 3.01,
        directRadiationWm2: 200,
        cloudCoverPct: 69,
      }),
    ).toBe(true);
    expect(
      hasWindow({
        uvIndex: 3.01,
        directRadiationWm2: 201,
        cloudCoverPct: 70,
      }),
    ).toBe(true);
    expect(
      hasWindow({
        uvIndex: 3.01,
        directRadiationWm2: 201,
        cloudCoverPct: 69.99,
      }),
    ).toBe(false);
  });

  it("starts candidate evaluation at exactly 15:00 Eastern", () => {
    const times = [
      "2026-07-02T18:00:00.000Z",
      "2026-07-02T19:00:00.000Z",
      "2026-07-02T20:00:00.000Z",
    ];
    const window = findBestLateDayWindow(
      localDate,
      times.map((time) => weatherHour(time)),
      times.map((time) => marineHour(time)),
      sunset,
    );

    expect(window?.startAt).toBe("2026-07-02T19:00:00.000Z");
  });

  it("generates ten stable local-day view models", () => {
    const weather: WeatherForecastHour[] = [];
    const marine: MarineForecastHour[] = [];
    const solar: SolarDay[] = [];

    for (let index = 0; index < 10; index += 1) {
      const date = new Date(Date.UTC(2026, 6, 1 + index))
        .toISOString()
        .slice(0, 10);
      const nextDate = new Date(Date.UTC(2026, 6, 2 + index))
        .toISOString()
        .slice(0, 10);
      for (const hour of [19, 20]) {
        const validAt = `${date}T${hour}:00:00.000Z`;
        weather.push(weatherHour(validAt));
        marine.push(marineHour(validAt));
      }
      // The sunset at 20:30 EDT arrives under the next GMT provider day.
      solar.push(solarDay(nextDate, `${nextDate}T00:30:00.000Z`));
    }

    const forecast = buildSwimmingForecast(weather, marine, solar);
    expect(forecast).toHaveLength(10);
    expect(forecast.every((day) => day.state === "match")).toBe(true);
    expect(forecast.map((day) => day.localDate)).toEqual(
      [...forecast.map((day) => day.localDate)].sort(),
    );
  });

  it("groups late-day hours by Eastern local date across DST", () => {
    const forecast = buildSwimmingForecast(
      [
        weatherHour("2026-10-31T19:00:00.000Z"),
        weatherHour("2026-10-31T20:00:00.000Z"),
        weatherHour("2026-11-01T20:00:00.000Z"),
        weatherHour("2026-11-01T21:00:00.000Z"),
      ],
      [
        marineHour("2026-10-31T19:00:00.000Z"),
        marineHour("2026-10-31T20:00:00.000Z"),
        marineHour("2026-11-01T20:00:00.000Z"),
        marineHour("2026-11-01T21:00:00.000Z"),
      ],
      [
        solarDay("2026-10-31", "2026-10-31T22:00:00.000Z"),
        solarDay("2026-11-01", "2026-11-01T23:00:00.000Z"),
      ],
    );

    expect(forecast.map((day) => day.localDate)).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(forecast.map((day) => day.state)).toEqual(["match", "match"]);
  });

  it("keeps a covered date as incomplete when only its sunset is missing", () => {
    // Provider days 2026-07-03 and 2026-07-05 carry the sunsets of Eastern
    // July 2 and July 4. The July 4 provider day (Eastern July 3 sunset) is
    // missing its sunset, so Eastern July 3 cannot be keyed from solar data
    // — but it has hourly coverage and must render as an incomplete card
    // rather than disappear from the outlook.
    const times = [
      "2026-07-02T19:00:00.000Z",
      "2026-07-03T19:00:00.000Z",
      "2026-07-04T19:00:00.000Z",
    ];
    const forecast = buildSwimmingForecast(
      times.map((validAt) => weatherHour(validAt)),
      times.map((validAt) => marineHour(validAt)),
      [
        solarDay("2026-07-03", "2026-07-03T00:30:00.000Z"),
        { providerDate: "2026-07-04", sunriseAt: null, sunsetAt: null },
        solarDay("2026-07-05", "2026-07-05T00:30:00.000Z"),
      ],
    );

    expect(forecast.map((day) => day.localDate)).toEqual([
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
    ]);
    expect(forecast[1]?.state).toBe("incomplete");
  });

  it("does not turn the GMT hourly buffer into an extra local forecast day", () => {
    const forecast = buildSwimmingForecast(
      [weatherHour("2026-07-02T00:00:00.000Z")],
      [marineHour("2026-07-02T00:00:00.000Z")],
      [solarDay("2026-07-03", "2026-07-03T00:30:00.000Z")],
    );

    expect(forecast.map((day) => day.localDate)).toEqual(["2026-07-02"]);
  });

  it("matches a summer sunset after 00:00Z to its Eastern local day", () => {
    // The pipeline requests timezone=GMT, so the 20:15 EDT July 2 sunset
    // (2026-07-03T00:15Z) is delivered under GMT provider day 2026-07-03.
    const times = [
      "2026-07-02T19:00:00.000Z",
      "2026-07-02T20:00:00.000Z",
      "2026-07-02T21:00:00.000Z",
    ];
    const forecast = buildSwimmingForecast(
      times.map((time) => weatherHour(time)),
      times.map((time) => marineHour(time)),
      [solarDay("2026-07-03", "2026-07-03T00:15:00.000Z")],
    );

    expect(forecast.map((day) => day.localDate)).toEqual(["2026-07-02"]);
    expect(forecast[0]?.state).toBe("match");
    expect(forecast[0]?.lateDaySummary.startAt).toBe(
      "2026-07-02T19:00:00.000Z",
    );
  });

  it("falls back to hour-derived dates when no solar day has a sunset", () => {
    const forecast = buildSwimmingForecast(
      [weatherHour("2026-07-02T19:00:00.000Z")],
      [marineHour("2026-07-02T19:00:00.000Z")],
      [{ providerDate: "2026-07-02", sunriseAt: null, sunsetAt: null }],
    );

    expect(forecast.map((day) => day.localDate)).toEqual(["2026-07-02"]);
    expect(forecast[0]?.state).toBe("incomplete");
  });
});
