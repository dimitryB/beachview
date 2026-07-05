import {
  clearRecommendationConfig,
  defaultRecommendationConfig,
  loadRecommendationConfig,
  RECOMMENDATION_CONFIG_STORAGE_KEY,
  saveRecommendationConfig,
  validateRecommendationConfig,
} from "@/config/recommendation-config";
import { SWIM_RULES } from "@/config/rules";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => void values.delete(key),
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

describe("recommendation config storage", () => {
  it("persists and loads a complete valid preference set", () => {
    const storage = memoryStorage();
    const rules = {
      ...SWIM_RULES,
      waveHeightRedAboveM: 0.8,
      lateDayStartHour: 16,
    };

    expect(saveRecommendationConfig(rules, storage)).toBe(true);
    expect(loadRecommendationConfig(storage)).toEqual(rules);
    expect(storage.values.has(RECOMMENDATION_CONFIG_STORAGE_KEY)).toBe(true);
    expect(
      JSON.parse(storage.values.get(RECOMMENDATION_CONFIG_STORAGE_KEY) ?? "{}")
        .schemaVersion,
    ).toBe(2);
  });

  it("migrates version 1 preferences with the default choppy height gate", () => {
    const storage = memoryStorage();
    const legacyRules: Record<string, number> = { ...SWIM_RULES };
    delete legacyRules.choppyWaveHeightAboveM;
    legacyRules.waveHeightRedAboveM = 0.8;
    storage.setItem(
      RECOMMENDATION_CONFIG_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, rules: legacyRules }),
    );

    expect(loadRecommendationConfig(storage)).toEqual({
      ...SWIM_RULES,
      waveHeightRedAboveM: 0.8,
      choppyWaveHeightAboveM: 0.4,
    });
  });

  it("falls back to fresh defaults for corrupt, incompatible, or invalid data", () => {
    const storage = memoryStorage();
    storage.setItem(RECOMMENDATION_CONFIG_STORAGE_KEY, "{not json");
    expect(loadRecommendationConfig(storage)).toEqual(SWIM_RULES);

    storage.setItem(
      RECOMMENDATION_CONFIG_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, rules: SWIM_RULES }),
    );
    expect(loadRecommendationConfig(storage)).toEqual(SWIM_RULES);

    storage.setItem(
      RECOMMENDATION_CONFIG_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        rules: {
          ...SWIM_RULES,
          windWarningAtKmh: 50,
          windStrongAtKmh: 35,
        },
      }),
    );
    expect(loadRecommendationConfig(storage)).toEqual(SWIM_RULES);
  });

  it("validates related thresholds and refuses to save invalid values", () => {
    const storage = memoryStorage();
    const invalid = {
      ...SWIM_RULES,
      waterColdBelowC: 25,
      waterWarmAboveC: 24,
      waveHeightRedAboveM: Number.NaN,
      lateDayStartHour: 15.5,
    };

    expect(validateRecommendationConfig(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("waveHeightRedAboveM"),
        expect.stringContaining("cold-water threshold"),
        expect.stringContaining("whole numbers"),
      ]),
    );
    expect(saveRecommendationConfig(invalid, storage)).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("handles unavailable browser storage without breaking defaults", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(loadRecommendationConfig(unavailableStorage)).toEqual(SWIM_RULES);
    expect(saveRecommendationConfig(SWIM_RULES, unavailableStorage)).toBe(
      false,
    );
    expect(clearRecommendationConfig(unavailableStorage)).toBe(false);
  });

  it("removes saved preferences and returns independent default objects", () => {
    const storage = memoryStorage();
    saveRecommendationConfig({ ...SWIM_RULES, uvWarningAt: 7 }, storage);

    expect(clearRecommendationConfig(storage)).toBe(true);
    expect(storage.values.has(RECOMMENDATION_CONFIG_STORAGE_KEY)).toBe(false);

    const first = defaultRecommendationConfig();
    const second = defaultRecommendationConfig();
    expect(first).toEqual(SWIM_RULES);
    expect(first).not.toBe(second);
  });
});
