export function TidePlaceholder() {
  return (
    <section className="panel tide-panel" aria-labelledby="tide-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Predicted tide</p>
          <h2 id="tide-heading">Today at Sandbridge</h2>
        </div>
        <span className="phase-badge">NOAA · MLLW</span>
      </div>
      <div
        className="tide-placeholder"
        aria-label="Tide data awaiting NOAA predictions"
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
        <p>NOAA high and low predictions arrive with the Phase 1 data layer.</p>
      </div>
    </section>
  );
}
