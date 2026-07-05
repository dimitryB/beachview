import { SWIM_RULES, type SwimRules } from "@/config/rules";

export const RECOMMENDATION_CONFIG_STORAGE_KEY =
  "vabeachcast:recommendation-config";

const SCHEMA_VERSION = 2;
const LEGACY_SCHEMA_VERSION = 1;

export const SWIM_RULE_LIMITS = Object.freeze({
  waveHeightRedAboveM: { min: 0.1, max: 5 },
  wavePeriodRedBelowS: { min: 1, max: 30 },
  choppyWaveHeightAboveM: { min: 0, max: 5 },
  waterColdBelowC: { min: 0, max: 35 },
  waterWarmAboveC: { min: 1, max: 40 },
  windWarningAtKmh: { min: 1, max: 100 },
  windGustWarningAtKmh: { min: 1, max: 150 },
  windStrongAtKmh: { min: 1, max: 150 },
  windGustStrongAtKmh: { min: 1, max: 200 },
  uvWarningAt: { min: 0, max: 15 },
  directRadiationWarningAtWm2: { min: 0, max: 1_200 },
  middayStartHour: { min: 0, max: 23 },
  middayEndHour: { min: 0, max: 23 },
  lateDayStartHour: { min: 0, max: 23 },
  lateDayMinimumHours: { min: 1, max: 6 },
  lowerExposureUvAtMost: { min: 0, max: 15 },
  lowerExposureRadiationAtMostWm2: { min: 0, max: 1_200 },
  lowerExposureCloudCoverAtLeastPct: { min: 0, max: 100 },
} satisfies Record<keyof SwimRules, { min: number; max: number }>);

interface StoredRecommendationConfig {
  schemaVersion: typeof SCHEMA_VERSION;
  rules: SwimRules;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyRules(source: Readonly<SwimRules>): SwimRules {
  return {
    waveHeightRedAboveM: source.waveHeightRedAboveM,
    wavePeriodRedBelowS: source.wavePeriodRedBelowS,
    choppyWaveHeightAboveM: source.choppyWaveHeightAboveM,
    waterColdBelowC: source.waterColdBelowC,
    waterWarmAboveC: source.waterWarmAboveC,
    windWarningAtKmh: source.windWarningAtKmh,
    windGustWarningAtKmh: source.windGustWarningAtKmh,
    windStrongAtKmh: source.windStrongAtKmh,
    windGustStrongAtKmh: source.windGustStrongAtKmh,
    uvWarningAt: source.uvWarningAt,
    directRadiationWarningAtWm2: source.directRadiationWarningAtWm2,
    middayStartHour: source.middayStartHour,
    middayEndHour: source.middayEndHour,
    lateDayStartHour: source.lateDayStartHour,
    lateDayMinimumHours: source.lateDayMinimumHours,
    lowerExposureUvAtMost: source.lowerExposureUvAtMost,
    lowerExposureRadiationAtMostWm2: source.lowerExposureRadiationAtMostWm2,
    lowerExposureCloudCoverAtLeastPct: source.lowerExposureCloudCoverAtLeastPct,
  };
}

export function defaultRecommendationConfig(): SwimRules {
  return copyRules(SWIM_RULES);
}

function rulesFromUnknown(value: unknown): SwimRules | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = {} as SwimRules;
  for (const key of Object.keys(SWIM_RULE_LIMITS) as Array<keyof SwimRules>) {
    const ruleValue = value[key];
    const limits = SWIM_RULE_LIMITS[key];
    if (
      typeof ruleValue !== "number" ||
      !Number.isFinite(ruleValue) ||
      ruleValue < limits.min ||
      ruleValue > limits.max
    ) {
      return null;
    }
    candidate[key] = ruleValue;
  }

  return validateRecommendationConfig(candidate).length === 0
    ? candidate
    : null;
}

export function validateRecommendationConfig(
  rules: Readonly<SwimRules>,
): string[] {
  const errors: string[] = [];

  for (const key of Object.keys(SWIM_RULE_LIMITS) as Array<keyof SwimRules>) {
    const value = rules[key];
    const { min, max } = SWIM_RULE_LIMITS[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      errors.push(`${key} must be between ${min} and ${max}.`);
    }
  }

  if (rules.waterColdBelowC >= rules.waterWarmAboveC) {
    errors.push(
      "The cold-water threshold must be lower than the warm-water threshold.",
    );
  }
  if (rules.windWarningAtKmh > rules.windStrongAtKmh) {
    errors.push(
      "The sustained-wind warning cannot exceed the strong-wind threshold.",
    );
  }
  if (rules.windGustWarningAtKmh > rules.windGustStrongAtKmh) {
    errors.push("The gust warning cannot exceed the strong-gust threshold.");
  }
  if (rules.lowerExposureUvAtMost > rules.uvWarningAt) {
    errors.push(
      "The lower-exposure UV maximum cannot exceed the UV warning threshold.",
    );
  }
  if (
    rules.lowerExposureRadiationAtMostWm2 > rules.directRadiationWarningAtWm2
  ) {
    errors.push(
      "The lower-exposure radiation maximum cannot exceed the radiation warning threshold.",
    );
  }
  if (rules.middayStartHour > rules.middayEndHour) {
    errors.push("The midday start hour cannot be later than its end hour.");
  }
  if (
    !Number.isInteger(rules.middayStartHour) ||
    !Number.isInteger(rules.middayEndHour) ||
    !Number.isInteger(rules.lateDayStartHour) ||
    !Number.isInteger(rules.lateDayMinimumHours)
  ) {
    errors.push("Time-window hours and duration must be whole numbers.");
  }

  return errors;
}

export function loadRecommendationConfig(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): SwimRules {
  try {
    const stored = storage.getItem(RECOMMENDATION_CONFIG_STORAGE_KEY);
    if (stored === null) {
      return defaultRecommendationConfig();
    }

    const envelope: unknown = JSON.parse(stored);
    if (!isRecord(envelope)) {
      return defaultRecommendationConfig();
    }

    if (
      envelope.schemaVersion === LEGACY_SCHEMA_VERSION &&
      isRecord(envelope.rules)
    ) {
      return (
        rulesFromUnknown({
          ...envelope.rules,
          choppyWaveHeightAboveM: SWIM_RULES.choppyWaveHeightAboveM,
        }) ?? defaultRecommendationConfig()
      );
    }

    if (envelope.schemaVersion !== SCHEMA_VERSION) {
      return defaultRecommendationConfig();
    }

    return rulesFromUnknown(envelope.rules) ?? defaultRecommendationConfig();
  } catch {
    return defaultRecommendationConfig();
  }
}

export function saveRecommendationConfig(
  rules: Readonly<SwimRules>,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): boolean {
  if (validateRecommendationConfig(rules).length > 0) {
    return false;
  }

  const envelope: StoredRecommendationConfig = {
    schemaVersion: SCHEMA_VERSION,
    rules: copyRules(rules),
  };

  try {
    storage.setItem(
      RECOMMENDATION_CONFIG_STORAGE_KEY,
      JSON.stringify(envelope),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearRecommendationConfig(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
): boolean {
  try {
    storage.removeItem(RECOMMENDATION_CONFIG_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
