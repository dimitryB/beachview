import { useMemo } from "react";

import { DataStatus } from "@/components/conditions/DataStatus";
import { formatNumber, formatRelativeAge } from "@/components/format";
import { BEACH } from "@/config/location";
import {
  buildSwimmingForecast,
  type SwimForecastDay,
} from "@/domain/forecast-blocks";
import { localDateForInstant } from "@/domain/time";
import { useCurrentTime } from "@/hooks/use-current-time";
import type {
  MarineDataset,
  ProviderState,
  WeatherDataset,
} from "@/types/domain";

const SKELETON_CARD_COUNT = 10;

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "numeric",
  day: "numeric",
});

const windowTimeFormatter = new Intl.DateTimeFormat("en-US", {
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

function metricText(
  value: number | null,
  maximumFractionDigits: number,
  unit: string,
): string {
  const formatted = formatNumber(value, maximumFractionDigits);
  return formatted === null ? "Unavailable" : `${formatted} ${unit}`;
}

interface SwimDayCardProps {
  day: SwimForecastDay;
  isStale: boolean;
  todayLocalDate: string | null;
}

function SwimDayCard({ day, isStale, todayLocalDate }: SwimDayCardProps) {
  const window = day.bestWindow;
  // Per DATA_AND_RULES §12: matching days use the window's midpoint water
  // temperature and in-window maximums; other days fall back to the
  // late-day (3 PM to sunset) summary, never all-day means.
  const waterTemperatureC = window
    ? window.waterTemperatureC
    : day.lateDaySummary.waterTemperatureC;
  const maxWaveHeightM = window
    ? window.maxWaveHeightM
    : day.lateDaySummary.maxWaveHeightM;
  const maxWindSpeedKmh = window
    ? window.maxWindSpeedKmh
    : day.lateDaySummary.maxWindSpeedKmh;

  // Per DATA_AND_RULES §14, a stale-data warning outranks a matching window:
  // the positive "match" treatment is demoted to a warning tone while the
  // derived window itself stays listed.
  const stateModifier = window && isStale ? "stale-match" : day.state;

  return (
    <li className={`swim-day swim-day--${stateModifier}`}>
      <h3 className="swim-day__title">
        {dayLabel(day.localDate, todayLocalDate)}
      </h3>
      {window ? (
        <>
          {isStale ? (
            <p className="swim-day__state swim-day__state--stale">
              <span aria-hidden="true">⚠</span> Based on stale data
            </p>
          ) : (
            <p className="swim-day__state swim-day__state--match">
              <span aria-hidden="true">✓</span> Matches preferences
            </p>
          )}
          <p className="swim-day__window">
            {windowTimeFormatter.format(new Date(window.startAt))} –{" "}
            {windowTimeFormatter.format(new Date(window.endAt))} Eastern
          </p>
          <ul
            aria-label="Why this predicted window matches"
            className="swim-day__chips"
          >
            {window.exposureReasons.map((reason) => (
              <li
                className={
                  isStale ? "swim-chip" : "swim-chip swim-chip--reason"
                }
                key={reason}
              >
                {reason}
              </li>
            ))}
            {window.nonBlockingWarnings.map((warning) => (
              <li
                className="swim-chip swim-chip--warning"
                key={`${warning.metric}:${warning.label}`}
              >
                {warning.label}
              </li>
            ))}
          </ul>
        </>
      ) : day.state === "incomplete" ? (
        <>
          <p className="swim-day__state swim-day__state--incomplete">
            <span aria-hidden="true">—</span> Data incomplete
          </p>
          <p className="swim-day__note">
            Forecast data is incomplete for this day, so late-day window
            matching is unavailable.
          </p>
        </>
      ) : (
        <>
          <p className="swim-day__state swim-day__state--no-match">
            No complete match
          </p>
          <p className="swim-day__note">{day.explanation}</p>
        </>
      )}
      <dl className="swim-day__metrics">
        <div className="swim-day__metric">
          <dt>Water</dt>
          <dd>{metricText(waterTemperatureC, 1, "°C")}</dd>
        </div>
        <div className="swim-day__metric">
          <dt>Waves (max)</dt>
          <dd>{metricText(maxWaveHeightM, 2, "m")}</dd>
        </div>
        <div className="swim-day__metric">
          <dt>Wind (max)</dt>
          <dd>{metricText(maxWindSpeedKmh, 0, "km/h")}</dd>
        </div>
      </dl>
    </li>
  );
}

function unavailableMessage(hasWeather: boolean, hasMarine: boolean): string {
  if (!hasWeather && !hasMarine) {
    return "Modeled weather and marine forecasts are unavailable, so the ten-day outlook cannot be derived yet.";
  }
  if (!hasWeather) {
    return "The modeled weather forecast is unavailable, so the ten-day outlook cannot be derived yet.";
  }
  if (!hasMarine) {
    return "The modeled marine forecast is unavailable, so the ten-day outlook cannot be derived yet.";
  }
  return "The hourly forecasts do not cover any upcoming local days yet.";
}

interface SwimmingOutlookProps {
  marine: ProviderState<MarineDataset>;
  onRetryMarine: () => void;
  onRetryWeather: () => void;
  weather: ProviderState<WeatherDataset>;
}

export function SwimmingOutlook({
  marine,
  onRetryMarine,
  onRetryWeather,
  weather,
}: SwimmingOutlookProps) {
  const currentTime = useCurrentTime();
  const weatherDataset = weather.data;
  const marineDataset = marine.data;
  const days = useMemo(
    () =>
      weatherDataset && marineDataset
        ? buildSwimmingForecast(
            weatherDataset.hourly,
            marineDataset.hourly,
            weatherDataset.solarDays,
          )
        : [],
    [marineDataset, weatherDataset],
  );
  const todayLocalDate =
    currentTime === null
      ? null
      : localDateForInstant(new Date(currentTime).toISOString());
  const isLoading =
    (!weatherDataset && weather.status === "loading") ||
    (!marineDataset && marine.status === "loading");
  // DATA_AND_RULES §14 precedence: a stale-data warning on a required feed
  // (weather or marine) outranks any matching comfort window below.
  const staleFeeds: { label: string; fetchedAt: string | null }[] = [];
  if (weather.status === "stale") {
    staleFeeds.push({ label: "weather", fetchedAt: weather.fetchedAt });
  }
  if (marine.status === "stale") {
    staleFeeds.push({ label: "marine data", fetchedAt: marine.fetchedAt });
  }
  const isStale = staleFeeds.length > 0;

  return (
    <section
      aria-labelledby="forecast-heading"
      className="panel forecast-panel"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">10-day outlook</p>
          <h2 id="forecast-heading">Late-day swim windows</h2>
        </div>
        <div className="data-status-row">
          <DataStatus label="Weather" state={weather} />
          <DataStatus label="Marine" state={marine} />
        </div>
      </div>
      <p className="swim-outlook__meta">
        Modeled hourly values from 3 PM to local sunset, Eastern time. Values
        summarize each late-day period; on matching days they describe the
        highlighted window.
      </p>
      {isLoading ? (
        <>
          <p className="sr-only">Loading the ten-day outlook.</p>
          <div aria-hidden="true" className="swim-outlook__scroller">
            <ul className="swim-outlook__list">
              {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
                <li className="swim-day swim-day--skeleton" key={index}>
                  <span className="swim-day__skeleton-bar swim-day__skeleton-bar--title" />
                  <span className="swim-day__skeleton-bar" />
                  <span className="swim-day__skeleton-bar swim-day__skeleton-bar--wide" />
                  <span className="swim-day__skeleton-bar" />
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : days.length === 0 ? (
        <div className="swim-outlook__unavailable">
          <p>
            {unavailableMessage(
              weatherDataset !== null,
              marineDataset !== null,
            )}
          </p>
          <div className="swim-outlook__actions">
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
            {!marineDataset && marine.status === "error" ? (
              <button
                className="provider-notice__retry"
                disabled={marine.isRefreshing}
                onClick={onRetryMarine}
                type="button"
              >
                {marine.isRefreshing ? "Retrying marine" : "Retry marine"}
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
              The late-day windows below are derived from stale data and may be
              outdated.
            </p>
          ) : null}
          <div
            aria-label="Ten-day swim outlook, scrolls horizontally on small screens"
            className="swim-outlook__scroller"
            role="region"
            // The horizontally scrollable forecast region must be reachable and
            // scrollable with the keyboard (UX_DESIGN §6.7, §10).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
          >
            <ul className="swim-outlook__list">
              {days.map((day) => (
                <SwimDayCard
                  day={day}
                  isStale={isStale}
                  key={day.localDate}
                  todayLocalDate={todayLocalDate}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
