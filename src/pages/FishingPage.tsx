import { lazy, Suspense } from "react";

import {
  ConditionCard,
  type ConditionAssessment,
} from "@/components/conditions/ConditionCard";
import { DataStatus } from "@/components/conditions/DataStatus";
import { ProviderNotice } from "@/components/conditions/ProviderNotice";
import { DeferredOutlook } from "@/components/forecast/DeferredOutlook";
import {
  formatDurationMinutes,
  formatEasternEventTime,
  formatEasternValidTime,
  formatNumber,
} from "@/components/format";
import { TideChart } from "@/components/tide/TideChart";
import { calculatePressureTendency } from "@/domain/pressure";
import { deriveTideState } from "@/domain/tide";
import { degreesToCardinal } from "@/domain/wind";
import { useCurrentTime } from "@/hooks/use-current-time";
import type { BeachDataState } from "@/types/domain";

const FishingOutlook = lazy(async () => {
  const module = await import("@/components/forecast/FishingOutlook");
  return { default: module.FishingOutlook };
});

interface FishingPageProps {
  data: BeachDataState;
  onRetryTides: () => void;
  onRetryWeather: () => void;
}

const MODELED_ASSESSMENT: ConditionAssessment = {
  tone: "info",
  label: "Modeled",
  explanation: "Open-Meteo modeled value.",
};

function modeledMeta(validAt: string | undefined): string | undefined {
  return validAt
    ? `Open-Meteo Weather modeled · valid ${formatEasternValidTime(validAt)}`
    : undefined;
}

export function FishingPage({
  data,
  onRetryTides,
  onRetryWeather,
}: FishingPageProps) {
  const currentTime = useCurrentTime();
  const weatherData = data.weather.data;
  const weather = weatherData?.current;
  const tideState =
    data.tides.data && currentTime !== null
      ? deriveTideState(
          data.tides.data.events,
          new Date(currentTime).toISOString(),
        )
      : null;
  const pressureTendency =
    weatherData && weather
      ? calculatePressureTendency(weather.pressureHpa, weatherData.hourly)
      : null;
  const pressureAssessment: ConditionAssessment =
    pressureTendency?.state && pressureTendency.state !== "unavailable"
      ? {
          tone: "info",
          label: pressureTendency.label,
          explanation:
            "Compared with the closest modeled pressure about three hours earlier.",
        }
      : {
          tone: "unavailable",
          label: "Tendency unavailable",
          explanation:
            "A valid modeled pressure comparison about three hours earlier is unavailable.",
        };
  const tideAssessment: ConditionAssessment =
    tideState && tideState.phase !== "unavailable"
      ? {
          tone: "info",
          label: "Predicted phase",
          explanation: "Derived from NOAA predicted high and low tide events.",
        }
      : {
          tone: "unavailable",
          label: "Phase unavailable",
          explanation:
            "Bounding NOAA tide predictions are unavailable for the current time.",
        };
  const direction = weather?.windDirectionDeg.value ?? null;
  const cardinal = direction === null ? null : degreesToCardinal(direction);
  const windSupporting =
    direction === null
      ? "Direction unavailable"
      : `Wind from ${cardinal ?? "unknown"} (${formatNumber(direction, 0)}°) · gust ${
          formatNumber(weather?.windGustKmh.value ?? null) ?? "unavailable"
        } km/h`;
  const estimatedHeight =
    tideState?.estimatedHeightM === null ||
    tideState?.estimatedHeightM === undefined
      ? null
      : `${formatNumber(tideState.estimatedHeightM, 2)} m estimated`;
  const nextEvent = tideState?.next ?? null;
  const nextEventDuration = formatDurationMinutes(
    tideState?.minutesUntilNextEvent ?? null,
  );
  const tideSupporting = [
    estimatedHeight,
    nextEvent
      ? `Next predicted ${nextEvent.type} ${formatEasternEventTime(nextEvent.validAt)}${
          nextEventDuration ? ` · in ${nextEventDuration}` : ""
        }`
      : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" · ");

  return (
    <div className="view-stack">
      <section className="hero-panel" aria-labelledby="fishing-heading">
        <div>
          <p className="eyebrow">Fishing</p>
          <h1 id="fishing-heading">
            Fishing signals, ordered around the tide.
          </h1>
          <p className="hero-panel__summary">
            Predicted tide events, modeled pressure, and wind behavior for
            planning a Sandbridge casting window.
          </p>
        </div>
        <div className="readiness-card readiness-card--info" role="status">
          <span className="readiness-card__symbol" aria-hidden="true">
            i
          </span>
          <div>
            <strong>Candidate signals, not guarantees</strong>
            <span>Species-specific guidance is outside the MVP.</span>
          </div>
        </div>
      </section>

      <section
        className="conditions-section"
        aria-labelledby="fishing-current-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marine dashboard</p>
            <h2 id="fishing-current-heading">Current fishing inputs</h2>
          </div>
          <div className="data-status-row">
            <DataStatus label="Weather" state={data.weather} />
            <DataStatus label="NOAA" state={data.tides} />
          </div>
        </div>
        <div className="provider-notice-stack">
          <ProviderNotice
            label="weather"
            onRetry={onRetryWeather}
            state={data.weather}
          />
          <ProviderNotice
            label="NOAA tide"
            onRetry={onRetryTides}
            state={data.tides}
          />
        </div>
        <div className="condition-grid condition-grid--fishing">
          <ConditionCard
            assessment={tideAssessment}
            description={tideAssessment.explanation}
            featured
            label="Tide phase"
            meta={
              data.tides.data
                ? `NOAA station ${data.tides.data.stationId} · ${data.tides.data.datum} · predicted high/low`
                : undefined
            }
            status={data.tides.status}
            supportingText={tideSupporting || undefined}
            value={tideState?.phaseLabel ?? null}
            valueStyle="text"
          />
          <ConditionCard
            assessment={pressureAssessment}
            description={pressureAssessment.explanation}
            label="Pressure"
            meta={modeledMeta(weather?.pressureHpa.validAt)}
            status={data.weather.status}
            unit="hPa"
            value={formatNumber(weather?.pressureHpa.value ?? null, 0)}
          />
          <ConditionCard
            assessment={MODELED_ASSESSMENT}
            description="Modeled sustained wind for the Sandbridge grid."
            label="Wind"
            meta={modeledMeta(weather?.windSpeedKmh.validAt)}
            status={data.weather.status}
            supportingText={windSupporting}
            unit="km/h"
            value={formatNumber(weather?.windSpeedKmh.value ?? null)}
          />
        </div>
      </section>

      <TideChart onRetry={onRetryTides} tides={data.tides} />
      <Suspense fallback={<DeferredOutlook activity="fishing" />}>
        <FishingOutlook
          onRetryTides={onRetryTides}
          onRetryWeather={onRetryWeather}
          tides={data.tides}
          weather={data.weather}
        />
      </Suspense>
    </div>
  );
}
