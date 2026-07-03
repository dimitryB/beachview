import {
  classifyTidePhase,
  deriveTideState,
  estimateTideHeight,
  findBoundingTideEvents,
  minutesUntilEvent,
} from "@/domain/tide";
import type { TideEvent } from "@/types/domain";

function tideEvent(
  id: string,
  type: "high" | "low",
  validAt: string,
  heightM: number,
): TideEvent {
  return {
    id,
    type,
    validAt,
    localDate: "2026-07-02",
    heightM,
    datum: "MLLW",
    source: "noaa-tides",
    kind: "predicted",
  };
}

const low = tideEvent("low", "low", "2026-07-02T12:00:00.000Z", 0);
const high = tideEvent("high", "high", "2026-07-02T18:00:00.000Z", 1);
const nextLow = tideEvent("next-low", "low", "2026-07-03T00:00:00.000Z", 0.2);

describe("tide derivation", () => {
  it("locates the official events bounding an instant", () => {
    expect(
      findBoundingTideEvents([nextLow, low, high], "2026-07-02T15:00:00.000Z"),
    ).toEqual({ previous: low, next: high });
  });

  it("classifies incoming, outgoing, and exact slack boundaries", () => {
    const incomingBounds = { previous: low, next: high };
    const outgoingBounds = { previous: high, next: nextLow };

    expect(classifyTidePhase(incomingBounds, "2026-07-02T15:00:00.000Z")).toBe(
      "incoming",
    );
    expect(classifyTidePhase(outgoingBounds, "2026-07-02T21:00:00.000Z")).toBe(
      "outgoing",
    );
    expect(classifyTidePhase(incomingBounds, "2026-07-02T12:30:00.000Z")).toBe(
      "near-low-slack",
    );
    expect(classifyTidePhase(incomingBounds, "2026-07-02T12:30:01.000Z")).toBe(
      "incoming",
    );
    expect(classifyTidePhase(incomingBounds, "2026-07-02T17:30:00.000Z")).toBe(
      "near-high-slack",
    );
  });

  it("uses cosine interpolation at the start, midpoint, and end", () => {
    expect(estimateTideHeight(low, high, low.validAt)).toBe(0);
    expect(
      estimateTideHeight(low, high, "2026-07-02T15:00:00.000Z"),
    ).toBeCloseTo(0.5);
    expect(estimateTideHeight(low, high, high.validAt)).toBe(1);
    expect(
      estimateTideHeight(low, high, "2026-07-02T19:00:00.000Z"),
    ).toBeNull();
  });

  it("calculates the next-event interval and an accessible estimated summary", () => {
    expect(minutesUntilEvent(high, "2026-07-02T17:29:30.000Z")).toBe(31);

    const state = deriveTideState(
      [low, high, nextLow],
      "2026-07-02T15:00:00.000Z",
    );
    expect(state).toMatchObject({
      phase: "incoming",
      phaseLabel: "Incoming",
      minutesUntilNextEvent: 180,
      estimateLabel: "Estimated between NOAA high/low predictions",
    });
    expect(state.estimatedHeightM).toBeCloseTo(0.5);
    expect(state.summary).toContain("Estimated height 0.50 m");
    expect(state.summary).toContain("NOAA predicted events");
  });

  it("returns unavailable without both bounding predictions", () => {
    const state = deriveTideState([high], "2026-07-02T17:00:00.000Z");
    expect(state.phase).toBe("unavailable");
    expect(state.estimatedHeightM).toBeNull();
  });
});
