import { BEACH } from "@/config/location";
import { SWIM_RULES, type SwimRules } from "@/config/rules";
import { zonedDateTimeParts } from "@/domain/time";

export type ComfortTone =
  "neutral" | "warning" | "danger" | "alert" | "unavailable";

export interface ComfortAssessment {
  metric:
    | "wave-height"
    | "wave-period"
    | "water-temperature"
    | "wind"
    | "uv"
    | "direct-radiation"
    | "exposure";
  tone: ComfortTone;
  label: string;
  explanation: string;
}

export interface SwimConditionInput {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  waterTemperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  uvIndex: number | null;
  directRadiationWm2: number | null;
  validAt: string;
}

export interface SwimConditionAssessment {
  assessments: ComfortAssessment[];
  highestTone: ComfortTone;
  summary: string;
}

function unavailable(
  metric: ComfortAssessment["metric"],
  label: string,
): ComfortAssessment {
  return {
    metric,
    tone: "unavailable",
    label: "Unavailable",
    explanation: `${label} data is unavailable.`,
  };
}

export function assessWaveHeight(
  value: number | null,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("wave-height", "Wave-height");
  }

  if (value > rules.waveHeightRedAboveM) {
    return {
      metric: "wave-height",
      tone: "danger",
      label: "High waves",
      explanation: `Above the configured ${rules.waveHeightRedAboveM.toFixed(1)} m threshold.`,
    };
  }

  return {
    metric: "wave-height",
    tone: "neutral",
    label: "Below high-wave threshold",
    explanation: `At or below ${rules.waveHeightRedAboveM.toFixed(1)} m.`,
  };
}

export function assessWavePeriod(
  value: number | null,
  waveHeightM: number | null,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("wave-period", "Wave-period");
  }

  if (value >= rules.wavePeriodRedBelowS) {
    return {
      metric: "wave-period",
      tone: "neutral",
      label: "Longer-period waves",
      explanation: `At or above ${rules.wavePeriodRedBelowS} s.`,
    };
  }

  if (waveHeightM === null || !Number.isFinite(waveHeightM)) {
    return unavailable("wave-period", "Wave-height context for wave-period");
  }

  if (waveHeightM > rules.choppyWaveHeightAboveM) {
    return {
      metric: "wave-period",
      tone: "danger",
      label: "Choppy",
      explanation: `Period is below ${rules.wavePeriodRedBelowS} s while wave height is above ${rules.choppyWaveHeightAboveM.toFixed(1)} m.`,
    };
  }

  return {
    metric: "wave-period",
    tone: "neutral",
    label: "Small short-period waves",
    explanation: `Period is below ${rules.wavePeriodRedBelowS} s, but wave height is at or below ${rules.choppyWaveHeightAboveM.toFixed(1)} m.`,
  };
}

export function assessWaterTemperature(
  value: number | null,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("water-temperature", "Water-temperature");
  }

  if (value < rules.waterColdBelowC) {
    return {
      metric: "water-temperature",
      tone: "warning",
      label: "Cold water",
      explanation: `Below the configured ${rules.waterColdBelowC}°C comfort threshold.`,
    };
  }

  if (value > rules.waterWarmAboveC) {
    return {
      metric: "water-temperature",
      tone: "alert",
      label: "Warm-water alert",
      explanation: `Above the configured ${rules.waterWarmAboveC}°C preference threshold; this is not a general hazard classification.`,
    };
  }

  return {
    metric: "water-temperature",
    tone: "neutral",
    label: "Moderate water temperature",
    explanation: `Between ${rules.waterColdBelowC}°C and ${rules.waterWarmAboveC}°C inclusive.`,
  };
}

export function assessWind(
  sustainedKmh: number | null,
  gustKmh: number | null,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (
    sustainedKmh === null ||
    gustKmh === null ||
    !Number.isFinite(sustainedKmh) ||
    !Number.isFinite(gustKmh)
  ) {
    return unavailable("wind", "Wind");
  }

  if (
    sustainedKmh >= rules.windStrongAtKmh ||
    gustKmh >= rules.windGustStrongAtKmh
  ) {
    return {
      metric: "wind",
      tone: "danger",
      label:
        gustKmh >= rules.windGustStrongAtKmh ? "Strong gusts" : "Strong wind",
      explanation: `At or above ${rules.windStrongAtKmh} km/h sustained or ${rules.windGustStrongAtKmh} km/h gusts.`,
    };
  }

  if (
    sustainedKmh >= rules.windWarningAtKmh ||
    gustKmh >= rules.windGustWarningAtKmh
  ) {
    return {
      metric: "wind",
      tone: "warning",
      label: "Blowing-sand discomfort",
      explanation: `At or above ${rules.windWarningAtKmh} km/h sustained or ${rules.windGustWarningAtKmh} km/h gusts.`,
    };
  }

  return {
    metric: "wind",
    tone: "neutral",
    label: "Below wind warning",
    explanation:
      "Sustained wind and gusts are below configured warning levels.",
  };
}

export function assessUv(
  value: number | null,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("uv", "UV");
  }

  if (value >= rules.uvWarningAt) {
    return {
      metric: "uv",
      tone: "warning",
      label: "Strong UV exposure",
      explanation: `UV index is at or above ${rules.uvWarningAt}.`,
    };
  }

  return {
    metric: "uv",
    tone: "neutral",
    label: "Below strong UV threshold",
    explanation: `UV index is below ${rules.uvWarningAt}.`,
  };
}

export function assessDirectRadiation(
  value: number | null,
  validAt: string,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("direct-radiation", "Direct-radiation");
  }

  const localTime = zonedDateTimeParts(validAt);
  if (!localTime) {
    return unavailable("direct-radiation", "Direct-radiation time");
  }

  const isMidday =
    localTime.hour >= rules.middayStartHour &&
    localTime.hour <= rules.middayEndHour;

  if (isMidday && value >= rules.directRadiationWarningAtWm2) {
    return {
      metric: "direct-radiation",
      tone: "warning",
      label: "Direct midday sun",
      explanation: `At or above ${rules.directRadiationWarningAtWm2} W/m² during ${rules.middayStartHour}:00–${rules.middayEndHour}:00 ${BEACH.timezone}.`,
    };
  }

  return {
    metric: "direct-radiation",
    tone: "neutral",
    label: "No midday radiation warning",
    explanation:
      "Outside the configured midday interval or below its radiation threshold.",
  };
}

export function assessExposure(
  uvIndex: number | null,
  directRadiationWm2: number | null,
  cloudCoverPct: number | null,
  validAt: string,
  rules: Readonly<SwimRules> = SWIM_RULES,
): ComfortAssessment {
  const uv = assessUv(uvIndex, rules);
  const radiation = assessDirectRadiation(directRadiationWm2, validAt, rules);

  if (radiation.tone === "warning") {
    return { ...radiation, metric: "exposure" };
  }

  if (uv.tone === "warning") {
    return { ...uv, metric: "exposure" };
  }

  if (
    uvIndex === null &&
    directRadiationWm2 === null &&
    cloudCoverPct === null
  ) {
    return unavailable("exposure", "Sun-exposure");
  }

  if (
    cloudCoverPct !== null &&
    Number.isFinite(cloudCoverPct) &&
    cloudCoverPct >= rules.lowerExposureCloudCoverAtLeastPct
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Overcast",
      explanation: `Cloud cover is at or above ${rules.lowerExposureCloudCoverAtLeastPct}%.`,
    };
  }

  if (
    uvIndex !== null &&
    Number.isFinite(uvIndex) &&
    uvIndex <= rules.lowerExposureUvAtMost
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Lower UV",
      explanation: `UV index is at or below ${rules.lowerExposureUvAtMost}.`,
    };
  }

  if (
    directRadiationWm2 !== null &&
    Number.isFinite(directRadiationWm2) &&
    directRadiationWm2 <= rules.lowerExposureRadiationAtMostWm2
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Lower direct sun",
      explanation: `Direct radiation is at or below ${rules.lowerExposureRadiationAtMostWm2} W/m².`,
    };
  }

  return {
    metric: "exposure",
    tone: "neutral",
    label: "Moderate exposure",
    explanation:
      "No configured strong UV or direct midday exposure warning is triggered.",
  };
}

export const TONE_PRIORITY: Record<ComfortTone, number> = {
  unavailable: 5,
  danger: 4,
  warning: 3,
  alert: 3,
  neutral: 1,
};

export function assessSwimConditions(
  input: SwimConditionInput,
  rules: Readonly<SwimRules> = SWIM_RULES,
): SwimConditionAssessment {
  const assessments = [
    assessWaveHeight(input.waveHeightM, rules),
    assessWavePeriod(input.wavePeriodS, input.waveHeightM, rules),
    assessWaterTemperature(input.waterTemperatureC, rules),
    assessWind(input.windSpeedKmh, input.windGustKmh, rules),
    assessUv(input.uvIndex, rules),
    assessDirectRadiation(input.directRadiationWm2, input.validAt, rules),
  ];
  const highest = assessments.reduce((current, candidate) =>
    TONE_PRIORITY[candidate.tone] > TONE_PRIORITY[current.tone]
      ? candidate
      : current,
  );

  return {
    assessments,
    highestTone: highest.tone,
    summary:
      highest.tone === "neutral"
        ? "No configured comfort warning is triggered."
        : highest.label,
  };
}

export interface SwimmingSummaryInput {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  waterTemperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  uvIndex: number | null;
  directRadiationWm2: number | null;
  cloudCoverPct: number | null;
  validAt: string;
  hasCoreData: boolean;
  hasStaleData: boolean;
}

export interface SwimmingCardAssessments {
  water: ComfortAssessment;
  waves: ComfortAssessment;
  period: ComfortAssessment;
  wind: ComfortAssessment;
  exposure: ComfortAssessment;
}

export interface SwimmingReadiness {
  tone: ComfortTone;
  label: string;
  detail: string;
}

export interface SwimmingSummary {
  cards: SwimmingCardAssessments;
  flags: ComfortAssessment[];
  readiness: SwimmingReadiness;
}

const NOT_A_SAFETY_DETERMINATION = "Not a safety determination.";

const NEUTRAL_READINESS_DETAIL =
  "Comfort rules do not replace official guidance or beach conditions.";

function isFlagTone(tone: ComfortTone): boolean {
  return tone === "danger" || tone === "warning" || tone === "alert";
}

function flagsDetail(flags: ComfortAssessment[]): string {
  return flags.length > 0
    ? `${flags.map((flag) => flag.label).join(" · ")}. ${NOT_A_SAFETY_DETERMINATION}`
    : NEUTRAL_READINESS_DETAIL;
}

export function deriveSwimmingSummary(
  input: SwimmingSummaryInput,
  rules: Readonly<SwimRules> = SWIM_RULES,
): SwimmingSummary {
  const cards: SwimmingCardAssessments = {
    water: assessWaterTemperature(input.waterTemperatureC, rules),
    waves: assessWaveHeight(input.waveHeightM, rules),
    period: assessWavePeriod(input.wavePeriodS, input.waveHeightM, rules),
    wind: assessWind(input.windSpeedKmh, input.windGustKmh, rules),
    exposure: assessExposure(
      input.uvIndex,
      input.directRadiationWm2,
      input.cloudCoverPct,
      input.validAt,
      rules,
    ),
  };
  const assessments = [
    cards.water,
    cards.waves,
    cards.period,
    cards.wind,
    cards.exposure,
  ];
  const flags = assessments
    .filter((assessment) => isFlagTone(assessment.tone))
    .sort(
      (left, right) => TONE_PRIORITY[right.tone] - TONE_PRIORITY[left.tone],
    );

  // Missing data outranks every favorable or flagged state (DATA_AND_RULES §14).
  const hasIncompleteAssessment = assessments.some(
    (assessment) => assessment.tone === "unavailable",
  );
  if (!input.hasCoreData || hasIncompleteAssessment) {
    return {
      cards,
      flags,
      readiness: {
        tone: "unavailable",
        label: "Current comfort data is incomplete",
        detail: `One or more required comfort inputs are unavailable. ${NOT_A_SAFETY_DETERMINATION}`,
      },
    };
  }

  // Stale-data warning outranks red rules and comfort flags (DATA_AND_RULES §14).
  if (input.hasStaleData) {
    return {
      cards,
      flags,
      readiness: {
        tone: "warning",
        label: "Using cached current conditions",
        detail: flagsDetail(flags),
      },
    };
  }

  if (flags.length > 0) {
    return {
      cards,
      flags,
      readiness: {
        tone: flags[0].tone,
        label: `${flags.length} configured comfort ${flags.length === 1 ? "flag" : "flags"}`,
        detail: flagsDetail(flags),
      },
    };
  }

  return {
    cards,
    flags,
    readiness: {
      tone: "neutral",
      label: "No configured comfort warning triggered",
      detail: NEUTRAL_READINESS_DETAIL,
    },
  };
}
