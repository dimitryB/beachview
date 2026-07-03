import { BEACH } from "@/config/location";
import { SWIM_RULES } from "@/config/rules";
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

export function assessWaveHeight(value: number | null): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("wave-height", "Wave-height");
  }

  if (value > SWIM_RULES.waveHeightRedAboveM) {
    return {
      metric: "wave-height",
      tone: "danger",
      label: "High waves",
      explanation: `Above the configured ${SWIM_RULES.waveHeightRedAboveM.toFixed(1)} m threshold.`,
    };
  }

  return {
    metric: "wave-height",
    tone: "neutral",
    label: "Below high-wave threshold",
    explanation: `At or below ${SWIM_RULES.waveHeightRedAboveM.toFixed(1)} m.`,
  };
}

export function assessWavePeriod(value: number | null): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("wave-period", "Wave-period");
  }

  if (value < SWIM_RULES.wavePeriodRedBelowS) {
    return {
      metric: "wave-period",
      tone: "danger",
      label: "Choppy",
      explanation: `Below the configured ${SWIM_RULES.wavePeriodRedBelowS} s period threshold.`,
    };
  }

  return {
    metric: "wave-period",
    tone: "neutral",
    label: "Longer-period waves",
    explanation: `At or above ${SWIM_RULES.wavePeriodRedBelowS} s.`,
  };
}

export function assessWaterTemperature(
  value: number | null,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("water-temperature", "Water-temperature");
  }

  if (value < SWIM_RULES.waterColdBelowC) {
    return {
      metric: "water-temperature",
      tone: "warning",
      label: "Cold water",
      explanation: `Below the configured ${SWIM_RULES.waterColdBelowC}°C comfort threshold.`,
    };
  }

  if (value > SWIM_RULES.waterWarmAboveC) {
    return {
      metric: "water-temperature",
      tone: "alert",
      label: "Warm-water alert",
      explanation: `Above the configured ${SWIM_RULES.waterWarmAboveC}°C preference threshold; this is not a general hazard classification.`,
    };
  }

  return {
    metric: "water-temperature",
    tone: "neutral",
    label: "Moderate water temperature",
    explanation: `Between ${SWIM_RULES.waterColdBelowC}°C and ${SWIM_RULES.waterWarmAboveC}°C inclusive.`,
  };
}

export function assessWind(
  sustainedKmh: number | null,
  gustKmh: number | null,
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
    sustainedKmh >= SWIM_RULES.windStrongAtKmh ||
    gustKmh >= SWIM_RULES.windGustStrongAtKmh
  ) {
    return {
      metric: "wind",
      tone: "danger",
      label:
        gustKmh >= SWIM_RULES.windGustStrongAtKmh
          ? "Strong gusts"
          : "Strong wind",
      explanation: `At or above ${SWIM_RULES.windStrongAtKmh} km/h sustained or ${SWIM_RULES.windGustStrongAtKmh} km/h gusts.`,
    };
  }

  if (
    sustainedKmh >= SWIM_RULES.windWarningAtKmh ||
    gustKmh >= SWIM_RULES.windGustWarningAtKmh
  ) {
    return {
      metric: "wind",
      tone: "warning",
      label: "Blowing-sand discomfort",
      explanation: `At or above ${SWIM_RULES.windWarningAtKmh} km/h sustained or ${SWIM_RULES.windGustWarningAtKmh} km/h gusts.`,
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

export function assessUv(value: number | null): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("uv", "UV");
  }

  if (value >= SWIM_RULES.uvWarningAt) {
    return {
      metric: "uv",
      tone: "warning",
      label: "Strong UV exposure",
      explanation: `UV index is at or above ${SWIM_RULES.uvWarningAt}.`,
    };
  }

  return {
    metric: "uv",
    tone: "neutral",
    label: "Below strong UV threshold",
    explanation: `UV index is below ${SWIM_RULES.uvWarningAt}.`,
  };
}

export function assessDirectRadiation(
  value: number | null,
  validAt: string,
): ComfortAssessment {
  if (value === null || !Number.isFinite(value)) {
    return unavailable("direct-radiation", "Direct-radiation");
  }

  const localTime = zonedDateTimeParts(validAt);
  if (!localTime) {
    return unavailable("direct-radiation", "Direct-radiation time");
  }

  const isMidday =
    localTime.hour >= SWIM_RULES.middayStartHour &&
    localTime.hour <= SWIM_RULES.middayEndHour;

  if (isMidday && value >= SWIM_RULES.directRadiationWarningAtWm2) {
    return {
      metric: "direct-radiation",
      tone: "warning",
      label: "Direct midday sun",
      explanation: `At or above ${SWIM_RULES.directRadiationWarningAtWm2} W/m² during ${SWIM_RULES.middayStartHour}:00–${SWIM_RULES.middayEndHour}:00 ${BEACH.timezone}.`,
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
): ComfortAssessment {
  const uv = assessUv(uvIndex);
  const radiation = assessDirectRadiation(directRadiationWm2, validAt);

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
    cloudCoverPct >= SWIM_RULES.lowerExposureCloudCoverAtLeastPct
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Overcast",
      explanation: `Cloud cover is at or above ${SWIM_RULES.lowerExposureCloudCoverAtLeastPct}%.`,
    };
  }

  if (
    uvIndex !== null &&
    Number.isFinite(uvIndex) &&
    uvIndex <= SWIM_RULES.lowerExposureUvAtMost
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Lower UV",
      explanation: `UV index is at or below ${SWIM_RULES.lowerExposureUvAtMost}.`,
    };
  }

  if (
    directRadiationWm2 !== null &&
    Number.isFinite(directRadiationWm2) &&
    directRadiationWm2 <= SWIM_RULES.lowerExposureRadiationAtMostWm2
  ) {
    return {
      metric: "exposure",
      tone: "neutral",
      label: "Lower direct sun",
      explanation: `Direct radiation is at or below ${SWIM_RULES.lowerExposureRadiationAtMostWm2} W/m².`,
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
): SwimConditionAssessment {
  const assessments = [
    assessWaveHeight(input.waveHeightM),
    assessWavePeriod(input.wavePeriodS),
    assessWaterTemperature(input.waterTemperatureC),
    assessWind(input.windSpeedKmh, input.windGustKmh),
    assessUv(input.uvIndex),
    assessDirectRadiation(input.directRadiationWm2, input.validAt),
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
): SwimmingSummary {
  const cards: SwimmingCardAssessments = {
    water: assessWaterTemperature(input.waterTemperatureC),
    waves: assessWaveHeight(input.waveHeightM),
    period: assessWavePeriod(input.wavePeriodS),
    wind: assessWind(input.windSpeedKmh, input.windGustKmh),
    exposure: assessExposure(
      input.uvIndex,
      input.directRadiationWm2,
      input.cloudCoverPct,
      input.validAt,
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
