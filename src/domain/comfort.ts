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
    | "direct-radiation";
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

const TONE_PRIORITY: Record<ComfortTone, number> = {
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
