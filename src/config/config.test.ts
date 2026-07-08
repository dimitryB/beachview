import { BEACH } from "@/config/location";
import {
  FISHING_RULES,
  PRESSURE_RULES,
  SWIM_RULES,
  TIDE_RULES,
  WIND_RULES,
} from "@/config/rules";

describe("fixed project configuration", () => {
  it("locks the application to Sandbridge", () => {
    expect(BEACH).toMatchObject({
      latitude: 36.6917,
      longitude: -75.92,
      timezone: "America/New_York",
      noaaTideStation: "8639428",
      noaaTideDatum: "MLLW",
      forecastDays: 10,
      shoreFacingDeg: 90,
    });
  });

  it("records the approved comfort thresholds", () => {
    expect(SWIM_RULES).toEqual({
      waveHeightRedAboveM: 1,
      wavePeriodRedBelowS: 7,
      choppyWaveHeightAboveM: 0.4,
      waterColdBelowC: 20,
      waterWarmAboveC: 24,
      windWarningAtKmh: 20,
      windGustWarningAtKmh: 30,
      windStrongAtKmh: 35,
      windGustStrongAtKmh: 50,
      uvWarningAt: 6,
      directRadiationWarningAtWm2: 500,
      middayStartHour: 11,
      middayEndHour: 15,
      lateDayStartHour: 15,
      lateDayMinimumHours: 2,
      lowerExposureUvAtMost: 3,
      lowerExposureRadiationAtMostWm2: 200,
      lowerExposureCloudCoverAtLeastPct: 70,
    });
  });

  it("records the approved derived-signal conventions", () => {
    expect(WIND_RULES).toEqual({
      materialShiftAtDeg: 45,
      materialShiftHours: 6,
      meaningfulSpeedAtKmh: 8,
      historyToleranceMinutes: 60,
    });
    expect(PRESSURE_RULES).toEqual({
      lookbackHours: 3,
      historyToleranceMinutes: 90,
      tendencyThresholdHpa: 1,
    });
    expect(TIDE_RULES).toEqual({
      slackWindowMinutes: 30,
    });
    expect(FISHING_RULES).toEqual({
      movementHalfWindowMinutes: 60,
      weatherMatchToleranceMinutes: 90,
      marineMatchToleranceMinutes: 90,
      movementModerateAtMPerH: 0.18,
      movementStrongAtMPerH: 0.28,
      twilightHalfWindowMinutes: 60,
      solunarMajorHalfWindowMinutes: 60,
      solunarMinorHalfWindowMinutes: 30,
      moonHorizonAltitudeDeg: 0.125,
      focusExtraContextSignals: 1,
      focusCandidateLimit: 4,
      onshoreAtMostDeg: 45,
      offshoreAtLeastDeg: 135,
    });
  });
});
