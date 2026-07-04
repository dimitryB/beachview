import { useMemo } from "react";

import { DataStatus } from "@/components/conditions/DataStatus";
import { formatNumber, formatRelativeAge } from "@/components/format";
import { BEACH } from "@/config/location";
import {
  buildFishingForecast,
  type FishingForecastDay,
  type FishingMovementWindow,
  type FishingTimelineEntry,
} from "@/domain/fishing";
import { SWIM_RULES, type SwimRules } from "@/config/rules";
import { localDateForInstant } from "@/domain/time";
import type { WindShift } from "@/domain/wind";
import { useCurrentTime } from "@/hooks/use-current-time";
import type {
  OfficialAlert,
  ProviderState,
  TideDataset,
  TideEvent,
  WeatherDataset,
} from "@/types/domain";

const SKELETON_DAY_COUNT = 3;
const SKELETON_ROW_COUNT = 3;
const NO_ALERTS: readonly OfficialAlert[] = [];

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "numeric",
  day: "numeric",
});

const entryTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BEACH.timezone,
  hour: "numeric",
  minute: "2-digit",
});

function dayLabel(localDate: string, todayLocalDate: string | null): string {
  if (localDate === todayLocalDate) {
    return "Today";
  }

  // localDate is an Eastern calendar date such as "2026-07-09". Formatting
  // its UTC noon with a UTC formatter yields the same calendar day without
  // depending on the runtime timezone.
  const noonUtc = Date.parse(`${localDate}T12:00:00.000Z`);
  if (!Number.isFinite(noonUtc)) {
    return localDate;
  }

  const parts = dayLabelFormatter.formatToParts(new Date(noonUtc));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  const weekday = part("weekday");
  const month = part("month");
  const day = part("day");
  return weekday && month && day ? `${weekday} ${month}/${day}` : localDate;
}

function entryTime(instant: string): string {
  return entryTimeFormatter.format(new Date(instant));
}

// Specific stale wording per UX_DESIGN §7.3, e.g. "Showing weather updated
// 48 min ago."
function staleFeedSentence(
  label: string,
  fetchedAt: string | null,
  currentTime: number | null,
): string {
  const age =
    fetchedAt !== null && currentTime !== null
      ? formatRelativeAge(fetchedAt, currentTime)
      : null;
  return age === null
    ? `Showing cached ${label}.`
    : `Showing ${label} updated ${age}.`;
}

function TideEventBody({ event }: { event: TideEvent }) {
  return (
    <>
      <p className="fishing-entry__title">
        <span aria-hidden="true">{event.type === "high" ? "▲" : "▼"}</span>{" "}
        Predicted {event.type} tide
      </p>
      <p className="fishing-entry__detail">{event.heightM.toFixed(2)} m MLLW</p>
    </>
  );
}

function movementWindText(movement: FishingMovementWindow): string {
  if (movement.windSpeedKmh === null) {
    return "Modeled wind unavailable";
  }

  const speed = formatNumber(movement.windSpeedKmh, 0);
  const from = movement.windDirection ? ` from ${movement.windDirection}` : "";
  const gust =
    movement.windGustKmh === null
      ? ""
      : ` · gust ${formatNumber(movement.windGustKmh, 0)} km/h`;
  return `Wind ${speed} km/h${from}${gust}`;
}

interface MovementBodyProps {
  isStale: boolean;
  movement: FishingMovementWindow;
}

function MovementBody({ isStale, movement }: MovementBodyProps) {
  return (
    <>
      <p className="fishing-entry__title">
        Stronger estimated {movement.direction} movement
      </p>
      <p className="fishing-entry__window">
        {entryTime(movement.startAt)} – {entryTime(movement.endAt)} Eastern
      </p>
      {movement.isCandidate ? (
        // Per DATA_AND_RULES §14, a stale-data warning outranks a candidate
        // window: the positive badge is demoted to a warning tone while the
        // derived period stays listed.
        isStale ? (
          <p className="fishing-entry__state fishing-entry__state--stale">
            <span aria-hidden="true">⚠</span> Based on stale data
          </p>
        ) : (
          <p className="fishing-entry__state fishing-entry__state--candidate">
            <span aria-hidden="true">◆</span> Candidate period
          </p>
        )
      ) : (
        <p className="fishing-entry__state fishing-entry__state--info">
          <span aria-hidden="true">—</span> Not a candidate
        </p>
      )}
      <ul
        aria-label="Reasoning attached to this period"
        className="fishing-entry__reasons"
      >
        <li>{movementWindText(movement)}</li>
        <li>Pressure: {movement.pressureTendency.label}</li>
        <li>Predicted tide range {movement.rangeM.toFixed(2)} m</li>
      </ul>
      <p className="fishing-entry__note">{movement.explanation}</p>
    </>
  );
}

function WindShiftBody({ shift }: { shift: WindShift }) {
  return (
    <>
      <p className="fishing-entry__title">
        <span aria-hidden="true">
          Wind shifts {shift.fromDirection} → {shift.toDirection}
        </span>
        <span className="sr-only">
          Wind shifts from {shift.fromDirection} to {shift.toDirection}
        </span>
      </p>
      <p className="fishing-entry__detail">
        Modeled {shift.changeDeg.toFixed(0)}° direction change
      </p>
    </>
  );
}

interface TimelineEntryProps {
  entry: FishingTimelineEntry;
  isStale: boolean;
}

function TimelineEntry({ entry, isStale }: TimelineEntryProps) {
  const candidateClass =
    entry.kind === "movement" && entry.movement.isCandidate
      ? isStale
        ? " fishing-entry--stale-candidate"
        : " fishing-entry--candidate"
      : "";

  return (
    <li
      className={`fishing-entry fishing-entry--${entry.kind}${candidateClass}`}
    >
      <span className="fishing-entry__time">{entryTime(entry.validAt)}</span>
      <div className="fishing-entry__body">
        {entry.kind === "tide-event" ? (
          <TideEventBody event={entry.event} />
        ) : entry.kind === "movement" ? (
          <MovementBody isStale={isStale} movement={entry.movement} />
        ) : (
          <WindShiftBody shift={entry.shift} />
        )}
      </div>
    </li>
  );
}

interface FishingDayGroupProps {
  day: FishingForecastDay;
  isStale: boolean;
  todayLocalDate: string | null;
}

function FishingDayGroup({
  day,
  isStale,
  todayLocalDate,
}: FishingDayGroupProps) {
  return (
    <li className="fishing-day">
      <h3 className="fishing-day__title">
        {dayLabel(day.localDate, todayLocalDate)}
      </h3>
      {day.maximumTideRangeM !== null ? (
        <p className="fishing-day__range">
          Largest predicted tide range {day.maximumTideRangeM.toFixed(2)} m
        </p>
      ) : null}
      {day.events.length === 0 ? (
        <p className="fishing-day__note">
          Tide predictions do not cover this date, so its predicted events and
          movement periods are unavailable.
        </p>
      ) : null}
      {day.timeline.length > 0 ? (
        <ol className="fishing-day__timeline">
          {day.timeline.map((entry) => (
            <TimelineEntry
              entry={entry}
              isStale={isStale}
              key={`${entry.kind}:${entry.validAt}`}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function unavailableMessage(hasTides: boolean, hasWeather: boolean): string {
  if (!hasTides && !hasWeather) {
    return "NOAA tide predictions and the modeled weather forecast are unavailable, so the fishing timeline cannot be derived yet.";
  }
  if (!hasTides) {
    return "NOAA tide predictions are unavailable, so the fishing timeline cannot be derived yet.";
  }
  return "NOAA tide predictions do not cover any upcoming local days yet.";
}

interface FishingOutlookProps {
  alerts?: readonly OfficialAlert[];
  onRetryTides: () => void;
  onRetryWeather: () => void;
  rules?: Readonly<SwimRules>;
  tides: ProviderState<TideDataset>;
  weather: ProviderState<WeatherDataset>;
}

export function FishingOutlook({
  alerts = NO_ALERTS,
  onRetryTides,
  onRetryWeather,
  rules = SWIM_RULES,
  tides,
  weather,
}: FishingOutlookProps) {
  const currentTime = useCurrentTime();
  const tideDataset = tides.data;
  const weatherDataset = weather.data;
  const weatherHours = weatherDataset?.hourly;
  const todayLocalDate =
    currentTime === null
      ? null
      : localDateForInstant(new Date(currentTime).toISOString());
  const days = useMemo(
    () =>
      tideDataset && todayLocalDate !== null
        ? buildFishingForecast(
            tideDataset.events,
            weatherHours ?? [],
            // Noon UTC on the Eastern calendar date maps back to the same
            // Eastern date, so the derivation only recomputes when the local
            // day (or a dataset) changes, not on every clock tick.
            `${todayLocalDate}T12:00:00.000Z`,
            alerts,
            rules,
          )
        : [],
    [alerts, rules, tideDataset, todayLocalDate, weatherHours],
  );
  const isLoading =
    currentTime === null ||
    (!tideDataset && tides.status === "loading") ||
    (!weatherDataset && weather.status === "loading");
  // DATA_AND_RULES §14 precedence: a stale-data warning on a required feed
  // (tides or weather) outranks any candidate fishing window below.
  const staleFeeds: { label: string; fetchedAt: string | null }[] = [];
  if (tides.status === "stale") {
    staleFeeds.push({ label: "tide predictions", fetchedAt: tides.fetchedAt });
  }
  if (weather.status === "stale") {
    staleFeeds.push({ label: "weather", fetchedAt: weather.fetchedAt });
  }
  const isStale = staleFeeds.length > 0;

  return (
    <section
      aria-labelledby="fishing-outlook-heading"
      className="panel forecast-panel fishing-outlook"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">10-day outlook</p>
          <h2 id="fishing-outlook-heading">Fishing timeline</h2>
        </div>
        <div className="data-status-row">
          <DataStatus label="NOAA" state={tides} />
          <DataStatus label="Weather" state={weather} />
        </div>
      </div>
      <p className="fishing-outlook__meta">
        NOAA predicted high/low events with each day&apos;s tide range, stronger
        estimated tidal-movement periods, and modeled wind and pressure context.
        Times are Eastern.
      </p>
      {isLoading ? (
        <>
          <p className="sr-only">Loading the fishing timeline.</p>
          <div aria-hidden="true">
            <ol className="fishing-outlook__days">
              {Array.from({ length: SKELETON_DAY_COUNT }, (_, dayIndex) => (
                <li
                  className="fishing-day fishing-day--skeleton"
                  key={dayIndex}
                >
                  <span className="fishing-day__skeleton-bar fishing-day__skeleton-bar--title" />
                  {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
                    <span
                      className="fishing-day__skeleton-bar"
                      key={rowIndex}
                    />
                  ))}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : days.length === 0 ? (
        <div className="fishing-outlook__unavailable">
          <p>
            {unavailableMessage(tideDataset !== null, weatherDataset !== null)}
          </p>
          <div className="fishing-outlook__actions">
            {!tideDataset && tides.status === "error" ? (
              <button
                className="provider-notice__retry"
                disabled={tides.isRefreshing}
                onClick={onRetryTides}
                type="button"
              >
                {tides.isRefreshing ? "Retrying tides" : "Retry tides"}
              </button>
            ) : null}
            {!weatherDataset && weather.status === "error" ? (
              <button
                className="provider-notice__retry"
                disabled={weather.isRefreshing}
                onClick={onRetryWeather}
                type="button"
              >
                {weather.isRefreshing ? "Retrying weather" : "Retry weather"}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {isStale ? (
            // Visible warning only; the page-level provider notices already
            // announce the failure once (UX_DESIGN §10), so no live region.
            <p className="outlook-stale-notice">
              <span aria-hidden="true">⚠</span>{" "}
              {staleFeeds
                .map((feed) =>
                  staleFeedSentence(feed.label, feed.fetchedAt, currentTime),
                )
                .join(" ")}{" "}
              The movement periods below are derived from stale data and may be
              outdated.
            </p>
          ) : null}
          {!weatherDataset ? (
            <div className="fishing-outlook__unavailable">
              <p>
                The modeled weather forecast is unavailable, so wind, gust, and
                pressure reasoning is missing and no period is marked as a
                candidate.
              </p>
              {weather.status === "error" ? (
                <div className="fishing-outlook__actions">
                  <button
                    className="provider-notice__retry"
                    disabled={weather.isRefreshing}
                    onClick={onRetryWeather}
                    type="button"
                  >
                    {weather.isRefreshing
                      ? "Retrying weather"
                      : "Retry weather"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <ol className="fishing-outlook__days">
            {days.map((day) => (
              <FishingDayGroup
                day={day}
                isStale={isStale}
                key={day.localDate}
                todayLocalDate={todayLocalDate}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
