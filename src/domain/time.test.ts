import { localDateForInstant, zonedDateTimeParts } from "@/domain/time";

describe("Sandbridge local time", () => {
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
});
