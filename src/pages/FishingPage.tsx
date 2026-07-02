import { ConditionPlaceholder } from "@/components/conditions/ConditionPlaceholder";
import { TidePlaceholder } from "@/components/tide/TidePlaceholder";

export function FishingPage() {
  return (
    <div className="view-stack">
      <section className="hero-panel" aria-labelledby="fishing-heading">
        <div>
          <p className="eyebrow">Fishing</p>
          <h1 id="fishing-heading">
            Fishing signals, ordered around the tide.
          </h1>
          <p className="hero-panel__summary">
            Predicted tide phase, pressure tendency, and wind behavior for
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
            <h2 id="fishing-current-heading">Current fishing signals</h2>
          </div>
          <span className="phase-badge">Awaiting data</span>
        </div>
        <div className="condition-grid condition-grid--fishing">
          <ConditionPlaceholder
            description="Incoming, outgoing, or near slack"
            label="Tide phase"
          />
          <ConditionPlaceholder
            description="Three-hour sea-level tendency"
            label="Pressure"
            unit="hPa"
          />
          <ConditionPlaceholder
            description="Sustained speed and direction"
            label="Wind"
            unit="km/h"
          />
        </div>
      </section>

      <TidePlaceholder />
    </div>
  );
}
