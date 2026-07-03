import {
  isStrictCalendarDate,
  isStrictIsoInstant,
  parseNoaaUtc,
  parseOpenMeteoUtc,
} from "@/data/validation";

const SOURCE = "open-meteo-weather" as const;

describe("timestamp validation", () => {
  it("normalizes valid provider timestamps to canonical UTC instants", () => {
    expect(parseOpenMeteoUtc("2028-02-29T22:15", SOURCE, "time")).toBe(
      "2028-02-29T22:15:00.000Z",
    );
    expect(parseNoaaUtc("2026-07-02 22:15", "noaa-tides", "time")).toBe(
      "2026-07-02T22:15:00.000Z",
    );
  });

  it("rejects unsupported shapes and calendar rollover", () => {
    expect(() => parseOpenMeteoUtc("2026-07-02Z", SOURCE, "time")).toThrow(
      "time is not a valid GMT timestamp.",
    );
    expect(() => parseOpenMeteoUtc("2026-02-30T22:15", SOURCE, "time")).toThrow(
      "time is not a valid GMT timestamp.",
    );
    expect(() => parseOpenMeteoUtc("2026-07-02T24:00", SOURCE, "time")).toThrow(
      "time is not a valid GMT timestamp.",
    );
    expect(() =>
      parseNoaaUtc("2026-02-30 22:15", "noaa-tides", "time"),
    ).toThrow("time is not a NOAA GMT timestamp.");
  });

  it("accepts only canonical internal instants and real calendar dates", () => {
    expect(isStrictIsoInstant("2026-07-02T22:15:00.000Z")).toBe(true);
    expect(isStrictIsoInstant("2026-07-02Z")).toBe(false);
    expect(isStrictIsoInstant("2026-02-30T22:15:00.000Z")).toBe(false);
    expect(isStrictCalendarDate("2028-02-29")).toBe(true);
    expect(isStrictCalendarDate("2026-02-29")).toBe(false);
  });
});
