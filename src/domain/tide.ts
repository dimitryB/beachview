import { BEACH } from "@/config/location";
import { TIDE_RULES } from "@/config/rules";
import { MINUTE_MS, instantMilliseconds } from "@/domain/time";
import type { TideEvent, TideEventType } from "@/types/domain";

export type TidePhase =
  | "incoming"
  | "outgoing"
  | "near-high-slack"
  | "near-low-slack"
  | "unavailable";

export interface TideBounds {
  previous: TideEvent | null;
  next: TideEvent | null;
}

export interface DerivedTideState extends TideBounds {
  phase: TidePhase;
  phaseLabel: string;
  estimatedHeightM: number | null;
  minutesUntilNextEvent: number | null;
  estimateLabel: "Estimated between NOAA high/low predictions";
  summary: string;
}

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BEACH.timezone,
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

function sortedValidEvents(
  events: readonly TideEvent[],
): Array<{ event: TideEvent; milliseconds: number }> {
  return events
    .map((event) => ({
      event,
      milliseconds: instantMilliseconds(event.validAt),
    }))
    .filter(
      (entry): entry is { event: TideEvent; milliseconds: number } =>
        entry.milliseconds !== null,
    )
    .sort((left, right) => left.milliseconds - right.milliseconds);
}

export function findBoundingTideEvents(
  events: readonly TideEvent[],
  instant: string,
): TideBounds {
  const current = instantMilliseconds(instant);
  if (current === null) {
    return { previous: null, next: null };
  }

  const sorted = sortedValidEvents(events);
  let previous: TideEvent | null = null;
  let next: TideEvent | null = null;

  for (const entry of sorted) {
    if (entry.milliseconds <= current) {
      previous = entry.event;
    } else {
      next = entry.event;
      break;
    }
  }

  return { previous, next };
}

function slackPhaseForEvent(type: TideEventType): TidePhase {
  return type === "high" ? "near-high-slack" : "near-low-slack";
}

export function classifyTidePhase(
  bounds: TideBounds,
  instant: string,
): TidePhase {
  const current = instantMilliseconds(instant);
  if (current === null) {
    return "unavailable";
  }

  const nearby = [bounds.previous, bounds.next]
    .filter((event): event is TideEvent => event !== null)
    .map((event) => ({
      event,
      distance: Math.abs(
        (instantMilliseconds(event.validAt) ?? Number.POSITIVE_INFINITY) -
          current,
      ),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (nearby && nearby.distance <= TIDE_RULES.slackWindowMinutes * MINUTE_MS) {
    return slackPhaseForEvent(nearby.event.type);
  }

  if (!bounds.previous || !bounds.next) {
    return "unavailable";
  }

  return bounds.next.type === "high" ? "incoming" : "outgoing";
}

export function estimateTideHeight(
  previous: TideEvent,
  next: TideEvent,
  instant: string,
): number | null {
  const previousTime = instantMilliseconds(previous.validAt);
  const nextTime = instantMilliseconds(next.validAt);
  const currentTime = instantMilliseconds(instant);

  if (
    previousTime === null ||
    nextTime === null ||
    currentTime === null ||
    nextTime <= previousTime ||
    currentTime < previousTime ||
    currentTime > nextTime
  ) {
    return null;
  }

  const progress = Math.min(
    1,
    Math.max(0, (currentTime - previousTime) / (nextTime - previousTime)),
  );
  return (
    previous.heightM +
    (next.heightM - previous.heightM) * ((1 - Math.cos(Math.PI * progress)) / 2)
  );
}

export function minutesUntilEvent(
  event: TideEvent | null,
  instant: string,
): number | null {
  if (!event) {
    return null;
  }

  const eventTime = instantMilliseconds(event.validAt);
  const currentTime = instantMilliseconds(instant);
  if (eventTime === null || currentTime === null || eventTime < currentTime) {
    return null;
  }

  return Math.ceil((eventTime - currentTime) / MINUTE_MS);
}

function phaseLabel(phase: TidePhase): string {
  switch (phase) {
    case "incoming":
      return "Incoming";
    case "outgoing":
      return "Outgoing";
    case "near-high-slack":
      return "Near high slack";
    case "near-low-slack":
      return "Near low slack";
    case "unavailable":
      return "Unavailable";
  }
}

function eventDescription(event: TideEvent): string {
  return `${event.type} ${event.heightM.toFixed(2)} m at ${eventTimeFormatter.format(new Date(event.validAt))}`;
}

export function deriveTideState(
  events: readonly TideEvent[],
  instant: string,
): DerivedTideState {
  const bounds = findBoundingTideEvents(events, instant);
  const phase = classifyTidePhase(bounds, instant);
  const estimatedHeightM =
    bounds.previous && bounds.next
      ? estimateTideHeight(bounds.previous, bounds.next, instant)
      : null;
  const minutesUntilNextEvent = minutesUntilEvent(bounds.next, instant);
  const descriptions = [
    `Predicted tide phase: ${phaseLabel(phase)}.`,
    estimatedHeightM === null
      ? "Estimated height unavailable."
      : `Estimated height ${estimatedHeightM.toFixed(2)} m between NOAA predicted events.`,
    bounds.previous
      ? `Previous predicted ${eventDescription(bounds.previous)}.`
      : "Previous predicted event unavailable.",
    bounds.next
      ? `Next predicted ${eventDescription(bounds.next)}${
          minutesUntilNextEvent === null
            ? "."
            : ` in ${minutesUntilNextEvent} minutes.`
        }`
      : "Next predicted event unavailable.",
  ];

  return {
    ...bounds,
    phase,
    phaseLabel: phaseLabel(phase),
    estimatedHeightM,
    minutesUntilNextEvent,
    estimateLabel: "Estimated between NOAA high/low predictions",
    summary: descriptions.join(" "),
  };
}
