import { BEACH } from "@/config/location";
import { SWIM_RULES } from "@/config/rules";

describe("fixed project configuration", () => {
  it("locks the application to Sandbridge", () => {
    expect(BEACH).toMatchObject({
      latitude: 36.6917,
      longitude: -75.92,
      timezone: "America/New_York",
      noaaTideStation: "8639428",
      noaaTideDatum: "MLLW",
      forecastDays: 10,
    });
  });

  it("records the approved comfort thresholds", () => {
    expect(SWIM_RULES).toEqual({
      waveHeightRedAboveM: 1,
      wavePeriodRedBelowS: 7,
      waterColdBelowC: 20,
      waterWarmAboveC: 24,
      windWarningAtKmh: 20,
      windGustWarningAtKmh: 30,
      windStrongAtKmh: 35,
      windGustStrongAtKmh: 50,
      lateDayStartHour: 15,
    });
  });
});
