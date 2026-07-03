import { BEACH } from "@/config/location";

export function formatNumber(
  value: number | null,
  maximumFractionDigits = 1,
): string | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function formatEasternEventTime(instant: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BEACH.timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));
}

export function formatEasternDateTime(instant: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BEACH.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(instant));
}

export function formatRelativeAge(
  instant: string,
  currentTime: number,
): string | null {
  const instantTime = Date.parse(instant);
  if (!Number.isFinite(instantTime)) {
    return null;
  }

  const ageMs = Math.max(0, currentTime - instantTime);
  const ageMinutes = Math.floor(ageMs / (60 * 1_000));

  if (ageMinutes < 1) {
    return "just now";
  }

  if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  }

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) {
    return `${ageHours} h ago`;
  }

  return `${Math.floor(ageHours / 24)} d ago`;
}
