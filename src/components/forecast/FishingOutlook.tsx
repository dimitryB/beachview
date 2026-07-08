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
import { FISHING_RULES, SWIM_RULES, type SwimRules } from "@/config/rules";
import { localDateForInstant } from "@/domain/time";
import type { WindShift } from "@/domain/wind";
import { useCurrentTime } from "@/hooks/use-current-time";
import type {
  MarineDataset,
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
  const shore = movement.shoreWind ? ` (${movement.shoreWind})` : "";
  const gust =
    movement.windGustKmh === null
      ? ""
      : ` · gust ${formatNumber(movement.windGustKmh, 0)} km/h`;
  return `Wind ${speed} km/h${from}${shore}${gust}`;
}

function movementStrengthText(movement: FishingMovementWindow): string {
  return `Estimated peak tide change ${movement.peakRateMPerH.toFixed(2)} m/h · ${movement.strength} movement`;
}

function twilightText(movement: FishingMovementWindow): string | null {
  return movement.twilightOverlap === null
    ? null
    : `Overlaps ${movement.twilightOverlap === "dawn" ? "dawn (sunrise)" : "dusk (sunset)"} twilight`;
}

function solunarText(movement: FishingMovementWindow): string | null {
  return movement.solunarOverlap === null
    ? null
    : `Overlaps a solunar ${movement.solunarOverlap} period (derived lunar estimate)`;
}

function waveText(movement: FishingMovementWindow): string | null {
  return movement.waveHeightM === null
    ? null
    : `Modeled wave height ${movement.waveHeightM.toFixed(1)} m`;
}

function focusedCandidates(
  days: readonly FishingForecastDay[],
): FishingMovementWindow[] {
  return days
    .flatMap((day) => day.movementWindows)
    .filter((movement) => movement.focus !== null)
    .slice(0, FISHING_RULES.focusCandidateLimit);
}

interface FocusedCandidatesProps {
  candidates: readonly FishingMovementWindow[];
  todayLocalDate: string | null;
}

function FocusedCandidates({
  candidates,
  todayLocalDate,
}: FocusedCandidatesProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="fishing-focus-heading" className="fishing-focus">
      <div className="fishing-focus__heading">
        <div>
          <p className="eyebrow">Candidate focus</p>
          <h3 id="fishing-focus-heading">Stronger, cleaner signals</h3>
        </div>
        <span className="fishing-focus__count">{candidates.length} shown</span>
      </div>
      <p className="fishing-focus__note">
        Focused candidates still pass the same wind and alert gate, then add
        cleaner wind plus stronger tide movement or timing context. The full
        timeline remains below.
      </p>
      <ol className="fishing-focus__list">
        {candidates.map((movement) => (
          <li
            className={`fishing-focus__item fishing-focus__item--${movement.focus?.level ?? "context"}`}
            key={`focus:${movement.midpointAt}`}
          >
            <p className="fishing-focus__title">
              {dayLabel(movement.localDate, todayLocalDate)} ·{" "}
              {movement.direction}
            </p>
            <p className="fishing-focus__window">
              {entryTime(movement.startAt)} – {entryTime(movement.endAt)}{" "}
              Eastern
            </p>
            <ul
              aria-label="Why this candidate is focused"
              className="fishing-focus__reasons"
            >
              {movement.focus?.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="fishing-focus__detail">
              {movementStrengthText(movement)} · {movementWindText(movement)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface MovementBodyProps {
  isStale: boolean;
  movement: FishingMovementWindow;
}

function MovementBody({ isStale, movement }: MovementBodyProps) {
  const candidateLabel =
    movement.focus === null ? "Candidate period" : movement.focus.label;

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
            <span aria-hidden="true">◆</span> {candidateLabel}
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
        <li>{movementStrengthText(movement)}</li>
        <li>{movementWindText(movement)}</li>
        {waveText(movement) !== null ? <li>{waveText(movement)}</li> : null}
        <li>Pressure: {movement.pressureTendency.label}</li>
        <li>Predicted tide range {movement.rangeM.toFixed(2)} m</li>
        {twilightText(movement) !== null ? (
          <li>{twilightText(movement)}</li>
        ) : null}
        {solunarText(movement) !== null ? (
          <li>{solunarText(movement)}</li>
        ) : null}
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
        : entry.movement.focus
          ? " fishing-entry--focused"
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
      {day.moonPhase !== null ? (
        <p className="fishing-day__moon">
          Moon: {day.moonPhase.phaseName} ·{" "}
          {day.moonPhase.illuminationPct.toFixed(0)}% illuminated (derived
          estimate)
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
  marine?: ProviderState<MarineDataset>;
  onRetryTides: () => void;
  onRetryWeather: () => void;
  rules?: Readonly<SwimRules>;
  tides: ProviderState<TideDataset>;
  weather: ProviderState<WeatherDataset>;
}

export function FishingOutlook({
  alerts = NO_ALERTS,
  marine,
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
  const solarDays = weatherDataset?.solarDays;
  const marineHours = marine?.data?.hourly;
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
            { marineHours, solarDays },
          )
        : [],
    [
      alerts,
      marineHours,
      rules,
      solarDays,
      tideDataset,
      todayLocalDate,
      weatherHours,
    ],
  );
  const focusCandidates = useMemo(() => focusedCandidates(days), [days]);
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
  // Marine data only feeds informational wave-height lines, so its
  // staleness names the feed and its age without demoting candidates.
  const isMarineStale = marine?.status === "stale" && marineHours !== undefined;
  if (isMarineStale) {
    staleFeeds.push({ label: "marine data", fetchedAt: marine.fetchedAt });
  }

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
          {marine ? <DataStatus label="Marine" state={marine} /> : null}
        </div>
      </div>
      <p className="fishing-outlook__meta">
        NOAA predicted high/low events with each day&apos;s tide range, stronger
        estimated tidal-movement periods graded by estimated peak tide change,
        and modeled wind, wave, pressure, twilight, and derived lunar context.
        Context lines are informational and do not change candidate status.
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
          {staleFeeds.length > 0 ? (
            // Visible warning only; the page-level provider notices already
            // announce the failure once (UX_DESIGN §10), so no live region.
            <p className="outlook-stale-notice">
              <span aria-hidden="true">⚠</span>{" "}
              {staleFeeds
                .map((feed) =>
                  staleFeedSentence(feed.label, feed.fetchedAt, currentTime),
                )
                .join(" ")}{" "}
              {isStale
                ? "The movement periods below are derived from stale data and may be outdated."
                : "Modeled wave heights below come from stale marine data and may be outdated."}
            </p>
          ) : null}
          {!isStale ? (
            <FocusedCandidates
              candidates={focusCandidates}
              todayLocalDate={todayLocalDate}
            />
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
