import { ConditionCard } from "@/components/conditions/ConditionCard";
import { DataStatus } from "@/components/conditions/DataStatus";
import { formatNumber } from "@/components/format";
import { TidePlaceholder } from "@/components/tide/TidePlaceholder";
import type { BeachDataState } from "@/types/domain";

interface FishingPageProps {
  data: BeachDataState;
}

export function FishingPage({ data }: FishingPageProps) {
  const weather = data.weather.data?.current;
  const tideDescription = data.tides.data
    ? `${data.tides.data.events.length} predicted events loaded · phase follows in Phase 2`
    : (data.tides.error ?? "Loading NOAA high and low predictions");
  const windDescription =
    weather?.windDirectionDeg.value !== null &&
    weather?.windDirectionDeg.value !== undefined
      ? `From ${formatNumber(weather.windDirectionDeg.value, 0)}° · Gust ${
          formatNumber(weather.windGustKmh.value) ?? "unavailable"
        } km/h`
      : "Sustained speed, direction, and gust";

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
        <div className="readiness-card" role="status">
          <span className="readiness-card__dot" aria-hidden="true" />
          <div>
            <strong>Candidate windows, not guarantees</strong>
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
        <div className="condition-grid condition-grid--fishing">
          <ConditionCard
            description={tideDescription}
            label="Tide phase"
            status={data.tides.status}
            value={null}
          />
          <ConditionCard
            description="Modeled sea-level pressure; tendency follows in Phase 2"
            label="Pressure"
            status={data.weather.status}
            unit="hPa"
            value={formatNumber(weather?.pressureHpa.value ?? null, 0)}
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
    </div>
  );
}
