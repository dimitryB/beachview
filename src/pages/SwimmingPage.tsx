import { lazy, Suspense } from "react";

import {
  ConditionCard,
  type ConditionAssessment,
} from "@/components/conditions/ConditionCard";
import { DataStatus } from "@/components/conditions/DataStatus";
import { ProviderNotice } from "@/components/conditions/ProviderNotice";
import { DeferredOutlook } from "@/components/forecast/DeferredOutlook";
import { formatEasternValidTime, formatNumber } from "@/components/format";
import { TideChart } from "@/components/tide/TideChart";
import { SWIM_RULES, type SwimRules } from "@/config/rules";
import { deriveSwimmingSummary } from "@/domain/comfort";
import { findClosestWeatherHour } from "@/domain/weather";
import { degreesToCardinal } from "@/domain/wind";
import type { BeachDataState } from "@/types/domain";

const SwimmingOutlook = lazy(async () => {
  const module = await import("@/components/forecast/SwimmingOutlook");
  return { default: module.SwimmingOutlook };
});

interface SwimmingPageProps {
  data: BeachDataState;
  onRetryMarine: () => void;
  onRetryTides: () => void;
  onRetryWeather: () => void;
  rules?: Readonly<SwimRules>;
}

const MODELED_ASSESSMENT: ConditionAssessment = {
  tone: "info",
  label: "Modeled",
  explanation: "Open-Meteo modeled value.",
};

function modeledMeta(
  label: string,
  validAt: string | undefined,
): string | undefined {
  return validAt
    ? `${label} modeled · valid ${formatEasternValidTime(validAt)}`
    : undefined;
}

export function SwimmingPage({
  data,
  onRetryMarine,
  onRetryTides,
  onRetryWeather,
  rules = SWIM_RULES,
}: SwimmingPageProps) {
  const weatherData = data.weather.data;
  const marineData = data.marine.data;
  const weather = weatherData?.current;
  const marine = marineData?.current;
  const exposureHour =
    weatherData && weather
      ? findClosestWeatherHour(
          weather.airTemperatureC.validAt,
          weatherData.hourly,
        )
      : null;
  const { cards, readiness } = deriveSwimmingSummary(
    {
      waveHeightM: marine?.waveHeightM.value ?? null,
      wavePeriodS: marine?.wavePeriodS.value ?? null,
      waterTemperatureC: marine?.seaSurfaceTemperatureC.value ?? null,
      windSpeedKmh: weather?.windSpeedKmh.value ?? null,
      windGustKmh: weather?.windGustKmh.value ?? null,
      uvIndex: exposureHour?.uvIndex ?? null,
      directRadiationWm2: exposureHour?.directRadiationWm2 ?? null,
      cloudCoverPct:
        exposureHour?.cloudCoverPct ?? weather?.cloudCoverPct.value ?? null,
      validAt: exposureHour?.validAt ?? weather?.airTemperatureC.validAt ?? "",
      hasCoreData: Boolean(weatherData && marineData),
      hasStaleData:
        data.weather.status === "stale" || data.marine.status === "stale",
    },
    rules,
  );
  const direction = weather?.windDirectionDeg.value ?? null;
  const cardinal = direction === null ? null : degreesToCardinal(direction);
  const windSupporting =
    direction === null
      ? "Direction unavailable"
      : `Wind from ${cardinal ?? "unknown"} (${formatNumber(direction, 0)}°) · gust ${
          formatNumber(weather?.windGustKmh.value ?? null) ?? "unavailable"
        } km/h`;
  const exposureValue =
    exposureHour?.uvIndex !== null && exposureHour?.uvIndex !== undefined
      ? `UV ${formatNumber(exposureHour.uvIndex, 1)}`
      : exposureHour?.cloudCoverPct !== null &&
          exposureHour?.cloudCoverPct !== undefined
        ? `${formatNumber(exposureHour.cloudCoverPct, 0)}% cloud`
        : null;
  const exposureSupporting = exposureHour
    ? `Cloud ${formatNumber(exposureHour.cloudCoverPct, 0) ?? "unavailable"}% · direct radiation ${
        formatNumber(exposureHour.directRadiationWm2, 0) ?? "unavailable"
      } W/m²`
    : undefined;

  return (
    <div className="view-stack">
      <section className="hero-panel" aria-labelledby="swimming-heading">
        <div>
          <p className="eyebrow">Swimming · Default view</p>
          <h1 id="swimming-heading">
            Swimming conditions, without the clutter.
          </h1>
          <p className="hero-panel__summary">
            A focused read on water, waves, wind, and the quieter late-day
            window at Sandbridge.
          </p>
        </div>
        <div
          className={`readiness-card readiness-card--${readiness.tone}`}
          role="status"
        >
          <span className="readiness-card__symbol" aria-hidden="true">
            {readiness.tone === "danger"
              ? "!"
              : readiness.tone === "warning" || readiness.tone === "alert"
                ? "△"
                : readiness.tone === "unavailable"
                  ? "—"
                  : "○"}
          </span>
          <div>
            <strong>{readiness.label}</strong>
            <span>{readiness.detail}</span>
          </div>
        </div>
      </section>

      <section className="conditions-section" aria-labelledby="current-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Right now</p>
            <h2 id="current-heading">Current modeled conditions</h2>
          </div>
          <div className="data-status-row">
            <DataStatus label="Weather" state={data.weather} />
            <DataStatus label="Marine" state={data.marine} />
          </div>
        </div>
        <div className="provider-notice-stack">
          <ProviderNotice
            label="weather"
            onRetry={onRetryWeather}
            state={data.weather}
          />
          <ProviderNotice
            label="marine"
            onRetry={onRetryMarine}
            state={data.marine}
          />
        </div>
        <div className="condition-grid">
          <ConditionCard
            assessment={cards.water}
            description={cards.water.explanation}
            featured
            label="Water"
            meta={modeledMeta(
              "Open-Meteo Marine",
              marine?.seaSurfaceTemperatureC.validAt,
            )}
            status={data.marine.status}
            unit="°C"
            value={formatNumber(marine?.seaSurfaceTemperatureC.value ?? null)}
          />
          <ConditionCard
            assessment={MODELED_ASSESSMENT}
            description="Modeled near-shore air temperature."
            featured
            label="Air"
            meta={modeledMeta(
              "Open-Meteo Weather",
              weather?.airTemperatureC.validAt,
            )}
            status={data.weather.status}
            unit="°C"
            value={formatNumber(weather?.airTemperatureC.value ?? null)}
          />
          <ConditionCard
            assessment={cards.waves}
            description={cards.waves.explanation}
            label="Waves"
            meta={modeledMeta("Open-Meteo Marine", marine?.waveHeightM.validAt)}
            status={data.marine.status}
            unit="m"
            value={formatNumber(marine?.waveHeightM.value ?? null, 2)}
          />
          <ConditionCard
            assessment={cards.period}
            description={cards.period.explanation}
            label="Period"
            meta={modeledMeta("Open-Meteo Marine", marine?.wavePeriodS.validAt)}
            status={data.marine.status}
            unit="s"
            value={formatNumber(marine?.wavePeriodS.value ?? null, 1)}
          />
          <ConditionCard
            assessment={cards.wind}
            description={cards.wind.explanation}
            label="Wind"
            meta={modeledMeta(
              "Open-Meteo Weather",
              weather?.windSpeedKmh.validAt,
            )}
            status={data.weather.status}
            supportingText={windSupporting}
            unit="km/h"
            value={formatNumber(weather?.windSpeedKmh.value ?? null)}
          />
          <ConditionCard
            assessment={cards.exposure}
            description={cards.exposure.explanation}
            label="Exposure"
            meta={modeledMeta("Open-Meteo Weather", exposureHour?.validAt)}
            status={data.weather.status}
            supportingText={exposureSupporting}
            value={exposureValue}
            valueStyle="text"
          />
        </div>
      </section>

      <TideChart onRetry={onRetryTides} tides={data.tides} />
      <Suspense fallback={<DeferredOutlook activity="swimming" />}>
        <SwimmingOutlook
          marine={data.marine}
          onRetryMarine={onRetryMarine}
          onRetryWeather={onRetryWeather}
          rules={rules}
          weather={data.weather}
        />
      </Suspense>
    </div>
  );
}
