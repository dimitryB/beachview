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
