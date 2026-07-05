export interface SwimRules {
  waveHeightRedAboveM: number;
  wavePeriodRedBelowS: number;
  choppyWaveHeightAboveM: number;
  waterColdBelowC: number;
  waterWarmAboveC: number;
  windWarningAtKmh: number;
  windGustWarningAtKmh: number;
  windStrongAtKmh: number;
  windGustStrongAtKmh: number;
  uvWarningAt: number;
  directRadiationWarningAtWm2: number;
  middayStartHour: number;
  middayEndHour: number;
  lateDayStartHour: number;
  lateDayMinimumHours: number;
  lowerExposureUvAtMost: number;
  lowerExposureRadiationAtMostWm2: number;
  lowerExposureCloudCoverAtLeastPct: number;
}

export const SWIM_RULES: Readonly<SwimRules> = Object.freeze({
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

export const WIND_RULES = Object.freeze({
  materialShiftAtDeg: 45,
  materialShiftHours: 6,
  meaningfulSpeedAtKmh: 8,
  historyToleranceMinutes: 60,
});

export const PRESSURE_RULES = Object.freeze({
  lookbackHours: 3,
  historyToleranceMinutes: 90,
  tendencyThresholdHpa: 1,
});

export const TIDE_RULES = Object.freeze({
  slackWindowMinutes: 30,
});

export const FISHING_RULES = Object.freeze({
  movementHalfWindowMinutes: 60,
  weatherMatchToleranceMinutes: 90,
});
