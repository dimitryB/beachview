import { FISHING_RULES } from "@/config/rules";
import { BEACH } from "@/config/location";
import {
  calculateMoonPhase,
  calculateSolunarPeriods,
  type SolunarPeriod,
} from "@/domain/moon";
import { HOUR_MS, MINUTE_MS, instantMilliseconds } from "@/domain/time";

describe("moon phase", () => {
  it("reports a new moon during a total solar eclipse", () => {
    // Total solar eclipse of 2017-08-21 (~18:25 UTC) requires a new moon.
    const phase = calculateMoonPhase("2017-08-21T18:30:00.000Z");
    expect(phase).not.toBeNull();
    expect(phase?.phaseName).toBe("New moon");
    expect(phase?.illuminationPct).toBeLessThan(2);
  });

  it("reports a full moon during a total lunar eclipse", () => {
    // Total lunar eclipse of 2019-01-21 (~05:12 UTC) requires a full moon.
    const phase = calculateMoonPhase("2019-01-21T05:00:00.000Z");
    expect(phase).not.toBeNull();
    expect(phase?.phaseName).toBe("Full moon");
    expect(phase?.illuminationPct).toBeGreaterThan(98);
  });

  it("reports a waxing crescent a few days after a new moon", () => {
    const phase = calculateMoonPhase("2017-08-25T18:30:00.000Z");
    expect(phase?.phaseName).toBe("Waxing crescent");
    expect(phase?.waxing).toBe(true);
  });

  it("reports a waning phase a few days after a full moon", () => {
    const phase = calculateMoonPhase("2019-01-25T05:00:00.000Z");
    expect(phase?.waxing).toBe(false);
  });

  it("returns null for an unparseable instant", () => {
    expect(calculateMoonPhase("not-a-date")).toBeNull();
  });
});

describe("solunar periods", () => {
  const start = "2026-07-02T00:00:00.000Z";
  const end = "2026-07-04T00:00:00.000Z";
  const periods = calculateSolunarPeriods(
    start,
    end,
    BEACH.latitude,
    BEACH.longitude,
  );

  function centerMs(period: SolunarPeriod): number {
    return instantMilliseconds(period.centerAt) ?? Number.NaN;
  }

  it("returns chronologically sorted periods inside the requested span", () => {
    expect(periods.length).toBeGreaterThan(0);
    const startMs = instantMilliseconds(start) ?? 0;
    const endMs = instantMilliseconds(end) ?? 0;
    for (const period of periods) {
      expect(centerMs(period)).toBeGreaterThanOrEqual(startMs);
      expect(centerMs(period)).toBeLessThanOrEqual(endMs);
    }
    expect(periods.map((period) => period.centerAt)).toEqual(
      [...periods.map((period) => period.centerAt)].sort(),
    );
  });

  it("spaces lunar transits by roughly half a lunar day", () => {
    const majors = periods.filter((period) => period.kind === "major");
    // The moon transits (upper plus lower) about four times in 48 hours.
    expect(majors.length).toBeGreaterThanOrEqual(3);
    expect(majors.length).toBeLessThanOrEqual(4);
    for (let index = 1; index < majors.length; index += 1) {
      const gapHours =
        (centerMs(majors[index]!) - centerMs(majors[index - 1]!)) / HOUR_MS;
      expect(gapHours).toBeGreaterThan(11.5);
      expect(gapHours).toBeLessThan(13.5);
    }
    // Upper and lower transits alternate.
    for (let index = 1; index < majors.length; index += 1) {
      expect(majors[index]?.event).not.toBe(majors[index - 1]?.event);
    }
  });

  it("finds moonrise and moonset minors that alternate", () => {
    const minors = periods.filter((period) => period.kind === "minor");
    expect(minors.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < minors.length; index += 1) {
      expect(minors[index]?.event).not.toBe(minors[index - 1]?.event);
    }
  });

  it("applies the configured half-window spans", () => {
    for (const period of periods) {
      const halfWindowMinutes =
        period.kind === "major"
          ? FISHING_RULES.solunarMajorHalfWindowMinutes
          : FISHING_RULES.solunarMinorHalfWindowMinutes;
      expect(
        centerMs(period) - (instantMilliseconds(period.startAt) ?? 0),
      ).toBe(halfWindowMinutes * MINUTE_MS);
      expect((instantMilliseconds(period.endAt) ?? 0) - centerMs(period)).toBe(
        halfWindowMinutes * MINUTE_MS,
      );
    }
  });

  it("returns nothing for an invalid or empty span", () => {
    expect(
      calculateSolunarPeriods(end, start, BEACH.latitude, BEACH.longitude),
    ).toEqual([]);
    expect(
      calculateSolunarPeriods(
        "not-a-date",
        end,
        BEACH.latitude,
        BEACH.longitude,
      ),
    ).toEqual([]);
  });
});
