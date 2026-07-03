import { DataStatus } from "@/components/conditions/DataStatus";
import { formatEasternEventTime } from "@/components/format";
import type { ProviderState, TideDataset } from "@/types/domain";

interface TidePlaceholderProps {
  tides: ProviderState<TideDataset>;
}

export function TidePlaceholder({ tides }: TidePlaceholderProps) {
  const referenceTime = tides.fetchedAt ? Date.parse(tides.fetchedAt) : 0;
  const availableEvents = tides.data?.events ?? [];
  const upcomingEvents = availableEvents
    .filter(
      (event) =>
        referenceTime === 0 ||
        Date.parse(event.validAt) >= referenceTime - 60 * 60 * 1_000,
    )
    .slice(0, 4);
  const shownEvents =
    upcomingEvents.length > 0 ? upcomingEvents : availableEvents.slice(0, 4);

  return (
    <section className="panel tide-panel" aria-labelledby="tide-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Predicted tide</p>
          <h2 id="tide-heading">Today at Sandbridge</h2>
        </div>
        <DataStatus label="NOAA · MLLW" state={tides} />
      </div>
      <div
        className="tide-placeholder"
        aria-label={
          tides.data
            ? "NOAA high and low predictions loaded; estimated curve begins in Phase 2"
            : "Tide data awaiting NOAA predictions"
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 680 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tide-fill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            className="tide-placeholder__fill"
            d="M0 120 C110 120 110 35 220 35 S330 145 440 145 S550 55 680 55 V180 H0 Z"
          />
          <path
            className="tide-placeholder__line"
            d="M0 120 C110 120 110 35 220 35 S330 145 440 145 S550 55 680 55"
          />
        </svg>
        <p>
          {tides.data
            ? "Dashed curve is illustrative; continuous estimation begins in Phase 2."
            : (tides.error ?? "Loading NOAA high and low predictions.")}
        </p>
      </div>
      {shownEvents.length > 0 ? (
        <ol className="tide-events" aria-label="Upcoming predicted tide events">
          {shownEvents.map((event) => (
            <li key={event.id}>
              <span
                className={`tide-events__type tide-events__type--${event.type}`}
              >
                {event.type === "high" ? "High" : "Low"}
              </span>
              <strong>{event.heightM.toFixed(2)} m</strong>
              <span>{formatEasternEventTime(event.validAt)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
