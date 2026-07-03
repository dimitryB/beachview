import {
  assessDirectRadiation,
  assessSwimConditions,
  assessUv,
  assessWaterTemperature,
  assessWaveHeight,
  assessWavePeriod,
  assessWind,
} from "@/domain/comfort";

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
