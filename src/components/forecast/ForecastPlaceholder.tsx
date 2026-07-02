const DAYS = ["Today", "Fri", "Sat", "Sun"];

export function ForecastPlaceholder() {
  return (
    <section
      className="panel forecast-panel"
      aria-labelledby="forecast-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">10-day outlook</p>
          <h2 id="forecast-heading">Late-day swim windows</h2>
        </div>
        <span className="phase-badge">Phase 1 data</span>
      </div>
      <div className="forecast-strip" aria-label="Forecast placeholders">
        {DAYS.map((day) => (
          <article className="forecast-day" key={day}>
            <h3>{day}</h3>
            <span className="forecast-day__line" />
            <span className="forecast-day__line forecast-day__line--short" />
            <p>Awaiting marine forecast</p>
          </article>
        ))}
      </div>
    </section>
  );
}
