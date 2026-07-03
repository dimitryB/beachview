import { PRESSURE_RULES } from "@/config/rules";
import { HOUR_MS, MINUTE_MS, instantMilliseconds } from "@/domain/time";
import type { DataPoint, WeatherForecastHour } from "@/types/domain";

export type PressureTendencyState =
  "rising" | "steady" | "falling" | "unavailable";

export interface PressureTendency {
  state: PressureTendencyState;
  changeHpa: number | null;
  currentHpa: number | null;
  previousHpa: number | null;
  currentAt: string | null;
  previousAt: string | null;
  label: string;
}

export function classifyPressureTendency(
  changeHpa: number,
): Exclude<PressureTendencyState, "unavailable"> | null {
  if (!Number.isFinite(changeHpa)) {
    return null;
  }

  if (changeHpa >= PRESSURE_RULES.tendencyThresholdHpa) {
    return "rising";
  }

  if (changeHpa <= -PRESSURE_RULES.tendencyThresholdHpa) {
    return "falling";
  }

  return "steady";
}

function unavailablePressureTendency(
  currentHpa: number | null,
  currentAt: string | null,
): PressureTendency {
  return {
    state: "unavailable",
    changeHpa: null,
    currentHpa,
    previousHpa: null,
    currentAt,
    previousAt: null,
    label: "Tendency unavailable",
  };
}

export function calculatePressureTendencyAt(
  currentAt: string,
  currentHpa: number | null,
  hours: readonly WeatherForecastHour[],
): PressureTendency {
  const currentMilliseconds = instantMilliseconds(currentAt);
  if (
    currentMilliseconds === null ||
    currentHpa === null ||
    !Number.isFinite(currentHpa)
  ) {
    return unavailablePressureTendency(currentHpa, currentAt);
  }

  const target = currentMilliseconds - PRESSURE_RULES.lookbackHours * HOUR_MS;
  const tolerance = PRESSURE_RULES.historyToleranceMinutes * MINUTE_MS;
  let closest: WeatherForecastHour | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const hour of hours) {
    if (hour.pressureHpa === null) {
      continue;
    }

    const milliseconds = instantMilliseconds(hour.validAt);
    if (milliseconds === null || milliseconds >= currentMilliseconds) {
      continue;
    }

    const distance = Math.abs(milliseconds - target);
    if (distance < closestDistance) {
      closest = hour;
      closestDistance = distance;
    }
  }

  if (!closest || closest.pressureHpa === null || closestDistance > tolerance) {
    return unavailablePressureTendency(currentHpa, currentAt);
  }

  const changeHpa = currentHpa - closest.pressureHpa;
  const state = classifyPressureTendency(changeHpa);
  if (!state) {
    return unavailablePressureTendency(currentHpa, currentAt);
  }

  const signedChange = `${changeHpa >= 0 ? "+" : ""}${changeHpa.toFixed(1)}`;
  return {
    state,
    changeHpa,
    currentHpa,
    previousHpa: closest.pressureHpa,
    currentAt,
    previousAt: closest.validAt,
    label: `${state[0]?.toUpperCase()}${state.slice(1)} ${signedChange} hPa / 3 h`,
  };
}

export function calculatePressureTendency(
  current: DataPoint<number>,
  hours: readonly WeatherForecastHour[],
): PressureTendency {
  return calculatePressureTendencyAt(current.validAt, current.value, hours);
}
