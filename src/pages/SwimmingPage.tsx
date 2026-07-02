import { ConditionPlaceholder } from "@/components/conditions/ConditionPlaceholder";
import { ForecastPlaceholder } from "@/components/forecast/ForecastPlaceholder";
import { TidePlaceholder } from "@/components/tide/TidePlaceholder";

export function SwimmingPage() {
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
            <strong>App foundation ready</strong>
            <span>Live data adapters begin in Phase 1.</span>
          </div>
        </div>
      </section>

      <section className="conditions-section" aria-labelledby="current-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Right now</p>
            <h2 id="current-heading">Current conditions</h2>
          </div>
          <span className="phase-badge">Awaiting data</span>
        </div>
        <div className="condition-grid">
          <ConditionPlaceholder
            description="Modeled sea-surface temperature"
            label="Water"
            unit="°C"
          />
          <ConditionPlaceholder
            description="Modeled near-shore air temperature"
            label="Air"
            unit="°C"
          />
          <ConditionPlaceholder
            description="Significant wave height"
            label="Waves"
            unit="m"
          />
          <ConditionPlaceholder
            description="Mean wave period"
            label="Period"
            unit="s"
          />
          <ConditionPlaceholder
            description="Sustained speed and direction"
            label="Wind"
            unit="km/h"
          />
        </div>
      </section>

      <TidePlaceholder />
      <ForecastPlaceholder />
    </div>
  );
}
