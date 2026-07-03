import { localDateForInstant, zonedDateTimeParts } from "@/domain/time";

describe("Sandbridge local time", () => {
  it("assigns an instant just after UTC midnight to the prior Eastern date", () => {
    expect(localDateForInstant("2026-07-03T00:15:00.000Z")).toBe("2026-07-02");
  });

  it("skips the nonexistent local hour during the spring DST transition", () => {
    expect(zonedDateTimeParts("2026-03-08T06:30:00.000Z")).toMatchObject({
      localDate: "2026-03-08",
      hour: 1,
      minute: 30,
    });
    expect(zonedDateTimeParts("2026-03-08T07:30:00.000Z")).toMatchObject({
      localDate: "2026-03-08",
      hour: 3,
      minute: 30,
    });
  });

  it("assigns UTC instants around the fall DST transition correctly", () => {
    expect(localDateForInstant("2026-11-01T03:30:00.000Z")).toBe("2026-10-31");
    expect(localDateForInstant("2026-11-01T06:30:00.000Z")).toBe("2026-11-01");
    expect(zonedDateTimeParts("2026-11-01T05:30:00.000Z")).toMatchObject({
      localDate: "2026-11-01",
      hour: 1,
      minute: 30,
    });
    expect(zonedDateTimeParts("2026-11-01T06:30:00.000Z")).toMatchObject({
      localDate: "2026-11-01",
      hour: 1,
      minute: 30,
    });
  });

  it("keeps the repeated fall hour distinguishable by its UTC instant", () => {
    const first = "2026-11-01T05:30:00.000Z";
    const second = "2026-11-01T06:30:00.000Z";

    expect(zonedDateTimeParts(first)).toEqual(zonedDateTimeParts(second));
    expect(Date.parse(second) - Date.parse(first)).toBe(60 * 60 * 1_000);
  });
});
