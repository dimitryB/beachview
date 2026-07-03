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
const sunset = solarDay(localDate, "2026-07-03T00:30:00.000Z");

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
      solar.push(solarDay(date, `${nextDate}T00:30:00.000Z`));
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

  it("does not turn the GMT hourly buffer into an extra local forecast day", () => {
    const forecast = buildSwimmingForecast(
      [weatherHour("2026-07-02T00:00:00.000Z")],
      [marineHour("2026-07-02T00:00:00.000Z")],
      [solarDay("2026-07-02", "2026-07-03T00:30:00.000Z")],
    );

    expect(forecast.map((day) => day.localDate)).toEqual(["2026-07-02"]);
  });
});
