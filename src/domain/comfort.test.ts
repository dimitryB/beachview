import {
  assessDirectRadiation,
  assessExposure,
  assessSwimConditions,
  assessUv,
  assessWaterTemperature,
  assessWaveHeight,
  assessWavePeriod,
  assessWind,
  deriveSwimmingSummary,
  type SwimmingSummaryInput,
} from "@/domain/comfort";
import { SWIM_RULES } from "@/config/rules";

function summaryInput(
  overrides: Partial<SwimmingSummaryInput> = {},
): SwimmingSummaryInput {
  return {
    waveHeightM: 0.6,
    wavePeriodS: 8,
    waterTemperatureC: 22,
    windSpeedKmh: 10,
    windGustKmh: 15,
    uvIndex: 3,
    directRadiationWm2: 100,
    cloudCoverPct: 90,
    validAt: "2026-07-02T20:00:00.000Z",
    hasCoreData: true,
    hasStaleData: false,
    ...overrides,
  };
}

describe("swimming comfort rules", () => {
  it("preserves exact wave-height and wave-period boundaries", () => {
    expect(assessWaveHeight(1).tone).toBe("neutral");
    expect(assessWaveHeight(1.001)).toMatchObject({
      tone: "danger",
      label: "High waves",
    });
    expect(assessWavePeriod(7).tone).toBe("neutral");
    expect(assessWavePeriod(6.999)).toMatchObject({
      tone: "danger",
      label: "Choppy",
    });
  });

  it("uses a supplied preference set without changing factory defaults", () => {
    const customRules = {
      ...SWIM_RULES,
      waveHeightRedAboveM: 0.5,
      wavePeriodRedBelowS: 9,
    };

    expect(assessWaveHeight(0.6, customRules).tone).toBe("danger");
    expect(assessWavePeriod(8, customRules).tone).toBe("danger");
    expect(assessWaveHeight(0.6).tone).toBe("neutral");
    expect(assessWavePeriod(8).tone).toBe("neutral");
  });

  it("preserves exact cold and warm water boundaries", () => {
    expect(assessWaterTemperature(19.999).tone).toBe("warning");
    expect(assessWaterTemperature(20).tone).toBe("neutral");
    expect(assessWaterTemperature(24).tone).toBe("neutral");
    expect(assessWaterTemperature(24.001)).toMatchObject({
      tone: "alert",
      label: "Warm-water alert",
    });
  });

  it("applies warning and strong-wind thresholds at equality", () => {
    expect(assessWind(19.999, 29.999).tone).toBe("neutral");
    expect(assessWind(20, 29).tone).toBe("warning");
    expect(assessWind(19, 30).tone).toBe("warning");
    expect(assessWind(35, 30).tone).toBe("danger");
    expect(assessWind(20, 50)).toMatchObject({
      tone: "danger",
      label: "Strong gusts",
    });
  });

  it("flags UV and direct midday exposure at equality", () => {
    expect(assessUv(5.999).tone).toBe("neutral");
    expect(assessUv(6).tone).toBe("warning");
    expect(assessDirectRadiation(500, "2026-07-02T19:00:00.000Z").tone).toBe(
      "warning",
    );
    expect(
      assessDirectRadiation(499.999, "2026-07-02T19:00:00.000Z").tone,
    ).toBe("neutral");
    expect(assessDirectRadiation(500, "2026-07-02T20:00:00.000Z").tone).toBe(
      "neutral",
    );
  });

  it("combines current exposure inputs with warning precedence", () => {
    expect(
      assessExposure(2, 500, 80, "2026-07-02T19:00:00.000Z"),
    ).toMatchObject({
      tone: "warning",
      label: "Direct midday sun",
      metric: "exposure",
    });
    expect(
      assessExposure(6, 100, 80, "2026-07-02T20:00:00.000Z"),
    ).toMatchObject({
      tone: "warning",
      label: "Strong UV exposure",
    });
    expect(
      assessExposure(4, 300, 70, "2026-07-02T20:00:00.000Z"),
    ).toMatchObject({
      tone: "neutral",
      label: "Overcast",
    });
    expect(
      assessExposure(null, null, null, "2026-07-02T20:00:00.000Z").tone,
    ).toBe("unavailable");
  });

  it("gives missing data precedence and never emits a safety claim", () => {
    const result = assessSwimConditions({
      waveHeightM: 1.2,
      wavePeriodS: 6,
      waterTemperatureC: 25,
      windSpeedKmh: 10,
      windGustKmh: 15,
      uvIndex: null,
      directRadiationWm2: 100,
      validAt: "2026-07-02T19:00:00.000Z",
    });

    expect(result.highestTone).toBe("unavailable");
    expect(result.summary.toLowerCase()).not.toContain("safe");
    expect(assessWaveHeight(Number.NaN).tone).toBe("unavailable");
    expect(assessWind(Number.NaN, 10).tone).toBe("unavailable");
  });
});

describe("deriveSwimmingSummary", () => {
  it("reports neutral readiness when nothing is flagged", () => {
    const summary = deriveSwimmingSummary(summaryInput());

    expect(summary.readiness).toEqual({
      tone: "neutral",
      label: "No configured comfort warning triggered",
      detail:
        "Comfort rules do not replace official guidance or beach conditions.",
    });
    expect(summary.flags).toHaveLength(0);
    expect(summary.cards.water.tone).toBe("neutral");
    expect(summary.cards.exposure.label).toBe("Overcast");
  });

  it("counts flags and orders danger ahead of warning and alert", () => {
    const summary = deriveSwimmingSummary(
      summaryInput({ waterTemperatureC: 25, wavePeriodS: 5 }),
    );

    expect(summary.readiness.tone).toBe("danger");
    expect(summary.readiness.label).toBe("2 configured comfort flags");
    expect(summary.flags.map((flag) => flag.label)).toEqual([
      "Choppy",
      "Warm-water alert",
    ]);
    expect(summary.readiness.detail).toBe(
      "Choppy · Warm-water alert. Not a safety determination.",
    );
  });

  it("lets an unavailable input outrank otherwise-favorable conditions", () => {
    const summary = deriveSwimmingSummary(
      summaryInput({ waterTemperatureC: null }),
    );

    expect(summary.readiness.tone).toBe("unavailable");
    expect(summary.readiness.label).toBe("Current comfort data is incomplete");
    expect(summary.readiness.detail).toContain("Not a safety determination.");
    expect(summary.cards.water.tone).toBe("unavailable");
  });

  it("lets an unavailable input outrank active danger flags", () => {
    const summary = deriveSwimmingSummary(
      summaryInput({
        waveHeightM: 2.4,
        uvIndex: null,
        directRadiationWm2: null,
        cloudCoverPct: null,
      }),
    );

    expect(summary.cards.waves.tone).toBe("danger");
    expect(summary.readiness.tone).toBe("unavailable");
    expect(summary.readiness.label).toBe("Current comfort data is incomplete");
  });

  it("reports incomplete data when a core provider dataset is missing", () => {
    const summary = deriveSwimmingSummary(summaryInput({ hasCoreData: false }));

    expect(summary.readiness.tone).toBe("unavailable");
    expect(summary.readiness.label).toBe("Current comfort data is incomplete");
  });

  it("surfaces stale cached data as a warning while keeping flag details", () => {
    const summary = deriveSwimmingSummary(
      summaryInput({ hasStaleData: true, wavePeriodS: 5 }),
    );

    expect(summary.readiness.tone).toBe("warning");
    expect(summary.readiness.label).toBe("Using cached current conditions");
    expect(summary.readiness.detail).toBe(
      "Choppy. Not a safety determination.",
    );
  });

  it("never emits a safety claim in readiness text", () => {
    const summaries = [
      deriveSwimmingSummary(summaryInput()),
      deriveSwimmingSummary(summaryInput({ waterTemperatureC: null })),
      deriveSwimmingSummary(summaryInput({ hasStaleData: true })),
    ];

    for (const summary of summaries) {
      const text =
        `${summary.readiness.label} ${summary.readiness.detail}`.toLowerCase();
      expect(text).not.toContain("safe to swim");
      expect(text).not.toContain("no rip-current risk");
    }
  });
});
