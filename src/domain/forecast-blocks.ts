import { BEACH } from "@/config/location";
import { SWIM_RULES } from "@/config/rules";
import {
  assessSwimConditions,
  type ComfortAssessment,
  type SwimConditionAssessment,
} from "@/domain/comfort";
import {
  HOUR_MS,
  instantMilliseconds,
  localDateForInstant,
  zonedDateTimeParts,
} from "@/domain/time";
import type {
  MarineForecastHour,
  SolarDay,
  WeatherForecastHour,
} from "@/types/domain";

export interface LateDayHourEvaluation {
  validAt: string;
  localDate: string;
  airTemperatureC: number | null;
  waterTemperatureC: number | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windGustKmh: number | null;
  cloudCoverPct: number | null;
  directRadiationWm2: number | null;
  uvIndex: number | null;
  assessment: SwimConditionAssessment;
  complete: boolean;
  qualifies: boolean;
  exposureReasons: string[];
  rejectionReasons: string[];
}

export interface LateDaySummary {
  startAt: string | null;
  endAt: string | null;
  waterTemperatureC: number | null;
  maxWaveHeightM: number | null;
  maxWindSpeedKmh: number | null;
}

export interface SwimWindow {
  startAt: string;
  endAt: string;
  localDate: string;
  waterTemperatureC: number;
  maxWaveHeightM: number;
  maxWindSpeedKmh: number;
  exposureReasons: string[];
  nonBlockingWarnings: ComfortAssessment[];
  hours: LateDayHourEvaluation[];
  label: "Matches configured swim preferences";
  explanation: string;
}

export type SwimForecastDayState = "match" | "no-match" | "incomplete";

export interface SwimForecastDay {
  localDate: string;
  state: SwimForecastDayState;
  bestWindow: SwimWindow | null;
  lateDaySummary: LateDaySummary;
  explanation: string;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value)
    ? value
    : null;
}

function maximum(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => value !== null);
  return finite.length > 0 ? Math.max(...finite) : null;
}

function exposureReasons(
  hour: Pick<
    WeatherForecastHour,
    "uvIndex" | "directRadiationWm2" | "cloudCoverPct"
  >,
): string[] {
  const reasons: string[] = [];

  if (
    hour.uvIndex !== null &&
    hour.uvIndex <= SWIM_RULES.lowerExposureUvAtMost
  ) {
    reasons.push(`UV ${hour.uvIndex.toFixed(1)} (≤3)`);
  }

  if (
    hour.directRadiationWm2 !== null &&
    hour.directRadiationWm2 <= SWIM_RULES.lowerExposureRadiationAtMostWm2
  ) {
    reasons.push(
      `Direct radiation ${hour.directRadiationWm2.toFixed(0)} W/m² (≤200)`,
    );
  }

  if (
    hour.cloudCoverPct !== null &&
    hour.cloudCoverPct >= SWIM_RULES.lowerExposureCloudCoverAtLeastPct
  ) {
    reasons.push(`Cloud cover ${hour.cloudCoverPct.toFixed(0)}% (≥70%)`);
  }

  return reasons;
}

function missingInputs(
  weather: WeatherForecastHour | undefined,
  marine: MarineForecastHour | undefined,
): string[] {
  const required = [
    ["wave height", marine?.waveHeightM],
    ["wave period", marine?.wavePeriodS],
    ["water temperature", marine?.seaSurfaceTemperatureC],
    ["wind speed", weather?.windSpeedKmh],
    ["wind gust", weather?.windGustKmh],
    ["UV", weather?.uvIndex],
    ["direct radiation", weather?.directRadiationWm2],
    ["cloud cover", weather?.cloudCoverPct],
  ] as const;

  return required
    .filter(
      ([, value]) =>
        value === null || value === undefined || !Number.isFinite(value),
    )
    .map(([label]) => `Missing ${label}`);
}

function evaluateHour(
  validAt: string,
  localDate: string,
  weather: WeatherForecastHour | undefined,
  marine: MarineForecastHour | undefined,
): LateDayHourEvaluation {
  const assessment = assessSwimConditions({
    waveHeightM: finiteOrNull(marine?.waveHeightM),
    wavePeriodS: finiteOrNull(marine?.wavePeriodS),
    waterTemperatureC: finiteOrNull(marine?.seaSurfaceTemperatureC),
    windSpeedKmh: finiteOrNull(weather?.windSpeedKmh),
    windGustKmh: finiteOrNull(weather?.windGustKmh),
    uvIndex: finiteOrNull(weather?.uvIndex),
    directRadiationWm2: finiteOrNull(weather?.directRadiationWm2),
    validAt,
  });
  const missing = missingInputs(weather, marine);
  const lowerExposure = weather ? exposureReasons(weather) : [];
  const dangerLabels = assessment.assessments
    .filter((item) => item.tone === "danger")
    .map((item) => item.label);
  const windAssessment = assessment.assessments.find(
    (item) => item.metric === "wind",
  );
  const windBelowWarning = windAssessment?.tone === "neutral";
  const rejectionReasons = [
    ...missing,
    ...dangerLabels,
    ...(windBelowWarning || missing.length > 0
      ? []
      : ["Wind reaches a configured warning threshold"]),
    ...(lowerExposure.length > 0 || missing.length > 0
      ? []
      : ["No lower-exposure signal"]),
  ];
  const complete = missing.length === 0;

  return {
    validAt,
    localDate,
    airTemperatureC: finiteOrNull(weather?.airTemperatureC),
    waterTemperatureC: finiteOrNull(marine?.seaSurfaceTemperatureC),
    waveHeightM: finiteOrNull(marine?.waveHeightM),
    wavePeriodS: finiteOrNull(marine?.wavePeriodS),
    windSpeedKmh: finiteOrNull(weather?.windSpeedKmh),
    windDirectionDeg: finiteOrNull(weather?.windDirectionDeg),
    windGustKmh: finiteOrNull(weather?.windGustKmh),
    cloudCoverPct: finiteOrNull(weather?.cloudCoverPct),
    directRadiationWm2: finiteOrNull(weather?.directRadiationWm2),
    uvIndex: finiteOrNull(weather?.uvIndex),
    assessment,
    complete,
    qualifies:
      complete &&
      dangerLabels.length === 0 &&
      windBelowWarning &&
      lowerExposure.length > 0,
    exposureReasons: lowerExposure,
    rejectionReasons,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function summaryForHours(
  hours: readonly LateDayHourEvaluation[],
  sunsetAt: string | null,
): LateDaySummary {
  const sorted = [...hours].sort((left, right) =>
    left.validAt.localeCompare(right.validAt),
  );
  const finalHour = sorted.at(-1)?.validAt ?? null;
  const unboundedEnd = finalHour
    ? new Date(Date.parse(finalHour) + HOUR_MS).toISOString()
    : null;
  const endAt =
    unboundedEnd && sunsetAt && unboundedEnd > sunsetAt
      ? sunsetAt
      : unboundedEnd;

  return {
    startAt: sorted[0]?.validAt ?? null,
    endAt,
    waterTemperatureC:
      sorted.find((hour) => hour.waterTemperatureC !== null)
        ?.waterTemperatureC ?? null,
    maxWaveHeightM: maximum(sorted.map((hour) => hour.waveHeightM)),
    maxWindSpeedKmh: maximum(sorted.map((hour) => hour.windSpeedKmh)),
  };
}

function qualifyingRuns(
  hours: readonly LateDayHourEvaluation[],
): LateDayHourEvaluation[][] {
  const sorted = [...hours].sort((left, right) =>
    left.validAt.localeCompare(right.validAt),
  );
  const runs: LateDayHourEvaluation[][] = [];
  let current: LateDayHourEvaluation[] = [];

  for (const hour of sorted) {
    const previous = current.at(-1);
    const consecutive =
      previous &&
      instantMilliseconds(hour.validAt) !== null &&
      instantMilliseconds(previous.validAt) !== null &&
      Date.parse(hour.validAt) - Date.parse(previous.validAt) === HOUR_MS;

    if (!hour.qualifies) {
      if (current.length > 0) {
        runs.push(current);
      }
      current = [];
    } else if (!previous || consecutive) {
      current.push(hour);
    } else {
      runs.push(current);
      current = [hour];
    }
  }

  if (current.length > 0) {
    runs.push(current);
  }

  return runs;
}

function windowForRun(
  run: LateDayHourEvaluation[],
  sunsetAt: string,
): SwimWindow | null {
  const first = run[0];
  const last = run.at(-1);
  if (!first || !last) {
    return null;
  }

  const unboundedEnd = new Date(
    Date.parse(last.validAt) + HOUR_MS,
  ).toISOString();
  const endAt = unboundedEnd > sunsetAt ? sunsetAt : unboundedEnd;
  const startMilliseconds = instantMilliseconds(first.validAt);
  const endMilliseconds = instantMilliseconds(endAt);
  if (
    startMilliseconds === null ||
    endMilliseconds === null ||
    endMilliseconds - startMilliseconds <
      SWIM_RULES.lateDayMinimumHours * HOUR_MS
  ) {
    return null;
  }

  const midpointHour = run[Math.floor((run.length - 1) / 2)];
  const waterTemperatureC = midpointHour?.waterTemperatureC;
  const maxWaveHeightM = maximum(run.map((hour) => hour.waveHeightM));
  const maxWindSpeedKmh = maximum(run.map((hour) => hour.windSpeedKmh));
  if (
    waterTemperatureC === null ||
    waterTemperatureC === undefined ||
    maxWaveHeightM === null ||
    maxWindSpeedKmh === null
  ) {
    return null;
  }

  const warnings = run.flatMap((hour) =>
    hour.assessment.assessments.filter(
      (assessment) =>
        assessment.tone === "warning" || assessment.tone === "alert",
    ),
  );
  const deduplicatedWarnings = [
    ...new Map(
      warnings.map((warning) => [
        `${warning.metric}:${warning.label}`,
        warning,
      ]),
    ).values(),
  ];
  const reasons = unique(run.flatMap((hour) => hour.exposureReasons));

  return {
    startAt: first.validAt,
    endAt,
    localDate: first.localDate,
    waterTemperatureC,
    maxWaveHeightM,
    maxWindSpeedKmh,
    exposureReasons: reasons,
    nonBlockingWarnings: deduplicatedWarnings,
    hours: run,
    label: "Matches configured swim preferences",
    explanation: `All required hours remain below red marine and wind states, below wind warning thresholds, and include lower exposure (${reasons.join("; ")}).`,
  };
}

export function buildLateDayHours(
  localDate: string,
  weatherHours: readonly WeatherForecastHour[],
  marineHours: readonly MarineForecastHour[],
  sunsetAt: string | null,
): LateDayHourEvaluation[] {
  if (!sunsetAt) {
    return [];
  }

  const sunsetMilliseconds = instantMilliseconds(sunsetAt);
  if (sunsetMilliseconds === null) {
    return [];
  }

  const weatherByTime = new Map(
    weatherHours.map((hour) => [hour.validAt, hour]),
  );
  const marineByTime = new Map(marineHours.map((hour) => [hour.validAt, hour]));
  const times = [...new Set([...weatherByTime.keys(), ...marineByTime.keys()])]
    .filter((validAt) => {
      const localTime = zonedDateTimeParts(validAt);
      const milliseconds = instantMilliseconds(validAt);
      return (
        localTime?.localDate === localDate &&
        localTime.hour >= SWIM_RULES.lateDayStartHour &&
        milliseconds !== null &&
        milliseconds < sunsetMilliseconds
      );
    })
    .sort();

  return times.map((validAt) =>
    evaluateHour(
      validAt,
      localDate,
      weatherByTime.get(validAt),
      marineByTime.get(validAt),
    ),
  );
}

export function findBestLateDayWindow(
  localDate: string,
  weatherHours: readonly WeatherForecastHour[],
  marineHours: readonly MarineForecastHour[],
  solarDay: SolarDay | null,
): SwimWindow | null {
  const sunsetAt = solarDay?.sunsetAt ?? null;
  if (!sunsetAt) {
    return null;
  }

  const hours = buildLateDayHours(
    localDate,
    weatherHours,
    marineHours,
    sunsetAt,
  );
  const candidates = qualifyingRuns(hours)
    .map((run) => windowForRun(run, sunsetAt))
    .filter((window): window is SwimWindow => window !== null)
    .sort((left, right) => {
      const leftDuration = Date.parse(left.endAt) - Date.parse(left.startAt);
      const rightDuration = Date.parse(right.endAt) - Date.parse(right.startAt);
      return (
        rightDuration - leftDuration ||
        left.startAt.localeCompare(right.startAt)
      );
    });

  return candidates[0] ?? null;
}

export function buildSwimmingForecast(
  weatherHours: readonly WeatherForecastHour[],
  marineHours: readonly MarineForecastHour[],
  solarDays: readonly SolarDay[],
): SwimForecastDay[] {
  // Solar days are requested with timezone=GMT, so providerDate is a GMT
  // calendar day. In summer the Eastern sunset (~20:15 EDT) falls after
  // 00:00 UTC of the next GMT day, so providerDate cannot be used as an
  // Eastern local date. Key each solar day by the Eastern local date of its
  // sunset instant instead. Days without a parseable sunset cannot be keyed
  // reliably and are skipped.
  const solarDayByLocalDate = new Map<string, SolarDay>();
  for (const day of solarDays) {
    const sunsetLocalDate = day.sunsetAt
      ? localDateForInstant(day.sunsetAt)
      : null;
    if (sunsetLocalDate && !solarDayByLocalDate.has(sunsetLocalDate)) {
      solarDayByLocalDate.set(sunsetLocalDate, day);
    }
  }

  const dates = new Set<string>(solarDayByLocalDate.keys());
  if (dates.size > 0) {
    // A solar day without a parseable sunset cannot be keyed, which would
    // otherwise silently drop that Eastern date from the outlook. Restore
    // hourly-covered dates that fall inside the solar span so such days
    // render as incomplete cards instead of disappearing. Dates outside
    // the span are GMT buffer artifacts (evening-only coverage from the
    // adjacent GMT day) and stay excluded.
    const sortedSolarDates = [...dates].sort();
    const minDate = sortedSolarDates[0]!;
    const maxDate = sortedSolarDates[sortedSolarDates.length - 1]!;
    for (const hour of [...weatherHours, ...marineHours]) {
      const localDate = localDateForInstant(hour.validAt);
      if (localDate && localDate >= minDate && localDate <= maxDate) {
        dates.add(localDate);
      }
    }
  } else {
    for (const hour of [...weatherHours, ...marineHours]) {
      const localDate = localDateForInstant(hour.validAt);
      if (localDate) {
        dates.add(localDate);
      }
    }
  }

  return [...dates]
    .sort()
    .slice(0, BEACH.forecastDays)
    .map((localDate) => {
      const solarDay = solarDayByLocalDate.get(localDate) ?? null;
      const lateDayHours = buildLateDayHours(
        localDate,
        weatherHours,
        marineHours,
        solarDay?.sunsetAt ?? null,
      );
      const bestWindow = findBestLateDayWindow(
        localDate,
        weatherHours,
        marineHours,
        solarDay,
      );
      const hasCompleteHour = lateDayHours.some((hour) => hour.complete);
      const state: SwimForecastDayState = bestWindow
        ? "match"
        : hasCompleteHour
          ? "no-match"
          : "incomplete";

      return {
        localDate,
        state,
        bestWindow,
        lateDaySummary: summaryForHours(
          lateDayHours,
          solarDay?.sunsetAt ?? null,
        ),
        explanation: bestWindow
          ? bestWindow.explanation
          : state === "incomplete"
            ? "Late-day inputs are incomplete."
            : "No late-day window matches all configured comfort rules.",
      };
    });
}
