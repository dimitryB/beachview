import { ConditionCard } from "@/components/conditions/ConditionCard";
import { DataStatus } from "@/components/conditions/DataStatus";
import { ForecastPlaceholder } from "@/components/forecast/ForecastPlaceholder";
import { formatNumber } from "@/components/format";
import { TidePlaceholder } from "@/components/tide/TidePlaceholder";
import type { BeachDataState } from "@/types/domain";

interface SwimmingPageProps {
  data: BeachDataState;
}

export function SwimmingPage({ data }: SwimmingPageProps) {
  const weather = data.weather.data?.current;
  const marine = data.marine.data?.current;
  const windDescription =
    weather?.windDirectionDeg.value !== null &&
    weather?.windDirectionDeg.value !== undefined
      ? `From ${formatNumber(weather.windDirectionDeg.value, 0)}° · Gust ${
          formatNumber(weather.windGustKmh.value) ?? "unavailable"
        } km/h`
      : "Sustained speed, direction, and gust";

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
        <div className="readiness-card" role="status">
          <span className="readiness-card__dot" aria-hidden="true" />
          <div>
            <strong>
              {data.weather.data && data.marine.data
                ? "Live Sandbridge feeds connected"
                : "Connecting live Sandbridge feeds"}
            </strong>
            <span>Comfort rules and window scoring begin in Phase 2.</span>
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
        <div className="condition-grid">
          <ConditionCard
            description="Modeled sea-surface temperature"
            label="Water"
            status={data.marine.status}
            unit="°C"
            value={formatNumber(marine?.seaSurfaceTemperatureC.value ?? null)}
          />
          <ConditionCard
            description="Modeled near-shore air temperature"
            label="Air"
            status={data.weather.status}
            unit="°C"
            value={formatNumber(weather?.airTemperatureC.value ?? null)}
          />
          <ConditionCard
            description="Significant wave height"
            label="Waves"
            status={data.marine.status}
            unit="m"
            value={formatNumber(marine?.waveHeightM.value ?? null, 2)}
          />
          <ConditionCard
            description="Mean wave period"
            label="Period"
            status={data.marine.status}
            unit="s"
            value={formatNumber(marine?.wavePeriodS.value ?? null, 1)}
          />
          <ConditionCard
            description={windDescription}
            label="Wind"
            status={data.weather.status}
            unit="km/h"
            value={formatNumber(weather?.windSpeedKmh.value ?? null)}
          />
        </div>
      </section>

      <TidePlaceholder tides={data.tides} />
      <ForecastPlaceholder marine={data.marine} weather={data.weather} />
    </div>
  );
}
