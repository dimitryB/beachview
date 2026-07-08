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
  marineMatchToleranceMinutes: 90,
  // Estimated peak tide-height change (m/h) at the midpoint of the cosine
  // curve: rate = π × range / (2 × duration). Sandbridge mean ranges near
  // 1 m over ~6.2 h sit around 0.25 m/h; springs exceed 0.3, neaps fall
  // below 0.18.
  movementModerateAtMPerH: 0.18,
  movementStrongAtMPerH: 0.28,
  // A movement window overlapping sunrise/sunset ± this half-window is
  // flagged as a dawn/dusk (twilight) overlap.
  twilightHalfWindowMinutes: 60,
  // Conventional solunar spans: ~2 h centered on lunar transit (major) and
  // ~1 h centered on moonrise/moonset (minor).
  solunarMajorHalfWindowMinutes: 60,
  solunarMinorHalfWindowMinutes: 30,
  // Effective moonrise/set altitude: mean lunar parallax raises the
  // geometric centre (+0.7275 × 0.9508°) while refraction lowers the
  // horizon (−0.567°).
  moonHorizonAltitudeDeg: 0.125,
  // Candidate-focus presentation stays separate from the candidate gate: a
  // focused candidate still has to pass the existing wind/alert gate, then it
  // needs moderate-or-strong movement plus either strong movement or at least
  // this many timing/context signals.
  focusExtraContextSignals: 1,
  focusCandidateLimit: 4,
  // Wind-from direction relative to the shore-facing bearing: within
  // onshoreAtMostDeg is onshore, beyond offshoreAtLeastDeg is offshore,
  // anything between is alongshore.
  onshoreAtMostDeg: 45,
  offshoreAtLeastDeg: 135,
});
