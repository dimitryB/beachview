import { FISHING_RULES } from "@/config/rules";
import { HOUR_MS, MINUTE_MS, instantMilliseconds } from "@/domain/time";

// Low-precision lunar and solar positions (Meeus, "Astronomical Algorithms",
// truncated series). Direction accuracy is a fraction of a degree, which
// keeps derived transit/rise/set instants within a few minutes — enough for
// an informational solunar overlay, never for navigation or safety output.

export type MoonPhaseName =
  | "New moon"
  | "Waxing crescent"
  | "First quarter"
  | "Waxing gibbous"
  | "Full moon"
  | "Waning gibbous"
  | "Last quarter"
  | "Waning crescent";

export interface MoonPhase {
  phaseName: MoonPhaseName;
  illuminationPct: number;
  waxing: boolean;
}

export type SolunarPeriodKind = "major" | "minor";

export interface SolunarPeriod {
  kind: SolunarPeriodKind;
  // "overhead"/"underfoot" are lunar transits (majors); "moonrise"/"moonset"
  // are horizon crossings (minors).
  event: "overhead" | "underfoot" | "moonrise" | "moonset";
  centerAt: string;
  startAt: string;
  endAt: string;
}

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const SAMPLE_STEP_MS = 5 * MINUTE_MS;

function daysSinceJ2000(milliseconds: number): number {
  return (milliseconds - J2000_MS) / (24 * HOUR_MS);
}

function normalizeAngleDeg(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

interface EquatorialPosition {
  rightAscensionDeg: number;
  declinationDeg: number;
}

interface MoonState extends EquatorialPosition {
  eclipticLongitudeDeg: number;
  eclipticLatitudeDeg: number;
}

function eclipticToEquatorial(
  longitudeDeg: number,
  latitudeDeg: number,
  days: number,
): EquatorialPosition {
  const obliquity = (23.4393 - 0.0000004 * days) * DEG;
  const longitude = longitudeDeg * DEG;
  const latitude = latitudeDeg * DEG;
  const rightAscension = Math.atan2(
    Math.sin(longitude) * Math.cos(obliquity) -
      Math.tan(latitude) * Math.sin(obliquity),
    Math.cos(longitude),
  );
  const declination = Math.asin(
    Math.sin(latitude) * Math.cos(obliquity) +
      Math.cos(latitude) * Math.sin(obliquity) * Math.sin(longitude),
  );
  return {
    rightAscensionDeg: normalizeAngleDeg(rightAscension / DEG),
    declinationDeg: declination / DEG,
  };
}

function moonState(milliseconds: number): MoonState {
  const days = daysSinceJ2000(milliseconds);
  const meanLongitude = normalizeAngleDeg(218.316 + 13.176396 * days);
  const meanAnomaly = normalizeAngleDeg(134.963 + 13.064993 * days) * DEG;
  const latitudeArgument = normalizeAngleDeg(93.272 + 13.22935 * days) * DEG;
  const eclipticLongitudeDeg = meanLongitude + 6.289 * Math.sin(meanAnomaly);
  const eclipticLatitudeDeg = 5.128 * Math.sin(latitudeArgument);
  return {
    eclipticLongitudeDeg,
    eclipticLatitudeDeg,
    ...eclipticToEquatorial(eclipticLongitudeDeg, eclipticLatitudeDeg, days),
  };
}

function sunEclipticLongitudeDeg(milliseconds: number): number {
  const days = daysSinceJ2000(milliseconds);
  const meanAnomaly = normalizeAngleDeg(357.529 + 0.98560028 * days) * DEG;
  return normalizeAngleDeg(
    280.459 +
      0.98564736 * days +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly),
  );
}

function greenwichSiderealDeg(milliseconds: number): number {
  return normalizeAngleDeg(
    280.46061837 + 360.98564736629 * daysSinceJ2000(milliseconds),
  );
}

// Hour angle normalized to (-180, 180]; it increases roughly 14.5°/hour.
function moonHourAngleDeg(
  milliseconds: number,
  longitudeDeg: number,
  moon: EquatorialPosition,
): number {
  const raw = normalizeAngleDeg(
    greenwichSiderealDeg(milliseconds) + longitudeDeg - moon.rightAscensionDeg,
  );
  return raw > 180 ? raw - 360 : raw;
}

function moonAltitudeDeg(
  milliseconds: number,
  latitudeDeg: number,
  longitudeDeg: number,
  moon: EquatorialPosition,
): number {
  const hourAngle = moonHourAngleDeg(milliseconds, longitudeDeg, moon) * DEG;
  const latitude = latitudeDeg * DEG;
  const declination = moon.declinationDeg * DEG;
  return (
    Math.asin(
      Math.sin(latitude) * Math.sin(declination) +
        Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
    ) / DEG
  );
}

export function calculateMoonPhase(instant: string): MoonPhase | null {
  const milliseconds = instantMilliseconds(instant);
  if (milliseconds === null) {
    return null;
  }

  const moon = moonState(milliseconds);
  const sunLongitude = sunEclipticLongitudeDeg(milliseconds);
  // Elongation of the moon from the sun along and across the ecliptic.
  const elongation = Math.acos(
    Math.cos(moon.eclipticLatitudeDeg * DEG) *
      Math.cos((moon.eclipticLongitudeDeg - sunLongitude) * DEG),
  );
  const illuminationPct = ((1 - Math.cos(elongation)) / 2) * 100;
  const phaseAngle = normalizeAngleDeg(
    moon.eclipticLongitudeDeg - sunLongitude,
  );
  const waxing = phaseAngle < 180;
  const names: MoonPhaseName[] = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  const index = Math.floor(normalizeAngleDeg(phaseAngle + 22.5) / 45) % 8;
  const phaseName = names[index] ?? "New moon";

  return { phaseName, illuminationPct, waxing };
}

function linearCrossingMs(
  fromMs: number,
  toMs: number,
  fromValue: number,
  toValue: number,
  target: number,
): number {
  const span = toValue - fromValue;
  if (span === 0) {
    return fromMs;
  }
  const fraction = Math.min(Math.max((target - fromValue) / span, 0), 1);
  return fromMs + (toMs - fromMs) * fraction;
}

function periodFor(
  kind: SolunarPeriodKind,
  event: SolunarPeriod["event"],
  centerMs: number,
): SolunarPeriod {
  const halfWindowMs =
    (kind === "major"
      ? FISHING_RULES.solunarMajorHalfWindowMinutes
      : FISHING_RULES.solunarMinorHalfWindowMinutes) * MINUTE_MS;
  return {
    kind,
    event,
    centerAt: new Date(centerMs).toISOString(),
    startAt: new Date(centerMs - halfWindowMs).toISOString(),
    endAt: new Date(centerMs + halfWindowMs).toISOString(),
  };
}

// Samples the lunar hour angle and altitude to locate transits (solunar
// majors) and horizon crossings (solunar minors) between two instants.
export function calculateSolunarPeriods(
  startInstant: string,
  endInstant: string,
  latitudeDeg: number,
  longitudeDeg: number,
): SolunarPeriod[] {
  const startMs = instantMilliseconds(startInstant);
  const endMs = instantMilliseconds(endInstant);
  if (startMs === null || endMs === null || endMs <= startMs) {
    return [];
  }

  const periods: SolunarPeriod[] = [];
  const startMoon = moonState(startMs);
  let previousMs = startMs;
  let previousHourAngle = moonHourAngleDeg(startMs, longitudeDeg, startMoon);
  let previousAltitude = moonAltitudeDeg(
    startMs,
    latitudeDeg,
    longitudeDeg,
    startMoon,
  );

  for (
    let sampleMs = startMs + SAMPLE_STEP_MS;
    sampleMs <= endMs + SAMPLE_STEP_MS;
    sampleMs += SAMPLE_STEP_MS
  ) {
    const moon = moonState(sampleMs);
    const hourAngle = moonHourAngleDeg(sampleMs, longitudeDeg, moon);
    const altitude = moonAltitudeDeg(sampleMs, latitudeDeg, longitudeDeg, moon);

    if (previousHourAngle < 0 && hourAngle >= 0) {
      // Upper transit: hour angle rises through zero (moon overhead).
      periods.push(
        periodFor(
          "major",
          "overhead",
          linearCrossingMs(
            previousMs,
            sampleMs,
            previousHourAngle,
            hourAngle,
            0,
          ),
        ),
      );
    } else if (hourAngle < previousHourAngle) {
      // Wrap from +180 toward -180: lower transit (moon underfoot).
      periods.push(
        periodFor(
          "major",
          "underfoot",
          linearCrossingMs(
            previousMs,
            sampleMs,
            previousHourAngle,
            hourAngle + 360,
            180,
          ),
        ),
      );
    }

    if (
      previousAltitude < FISHING_RULES.moonHorizonAltitudeDeg &&
      altitude >= FISHING_RULES.moonHorizonAltitudeDeg
    ) {
      periods.push(
        periodFor(
          "minor",
          "moonrise",
          linearCrossingMs(
            previousMs,
            sampleMs,
            previousAltitude,
            altitude,
            FISHING_RULES.moonHorizonAltitudeDeg,
          ),
        ),
      );
    } else if (
      previousAltitude >= FISHING_RULES.moonHorizonAltitudeDeg &&
      altitude < FISHING_RULES.moonHorizonAltitudeDeg
    ) {
      periods.push(
        periodFor(
          "minor",
          "moonset",
          linearCrossingMs(
            previousMs,
            sampleMs,
            previousAltitude,
            altitude,
            FISHING_RULES.moonHorizonAltitudeDeg,
          ),
        ),
      );
    }

    previousMs = sampleMs;
    previousHourAngle = hourAngle;
    previousAltitude = altitude;
  }

  return periods
    .filter((period) => {
      const centerMs = instantMilliseconds(period.centerAt);
      return centerMs !== null && centerMs >= startMs && centerMs <= endMs;
    })
    .sort((left, right) => left.centerAt.localeCompare(right.centerAt));
}
