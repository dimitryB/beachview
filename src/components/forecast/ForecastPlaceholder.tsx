import { DataStatus } from "@/components/conditions/DataStatus";
import type {
  MarineDataset,
  ProviderState,
  WeatherDataset,
} from "@/types/domain";

const DAYS = ["Today", "Fri", "Sat", "Sun"];

interface ForecastPlaceholderProps {
  marine: ProviderState<MarineDataset>;
  weather: ProviderState<WeatherDataset>;
}

export function ForecastPlaceholder({
  marine,
  weather,
}: ForecastPlaceholderProps) {
  const forecastReady = Boolean(
    marine.data?.hourly.length && weather.data?.hourly.length,
  );

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
        <span className="phase-badge">
          {forecastReady ? "Hourly feeds ready" : "Awaiting data"}
        </span>
      </div>
      <div className="data-status-row">
        <DataStatus label="Weather" state={weather} />
        <DataStatus label="Marine" state={marine} />
      </div>
      <div className="forecast-strip" aria-label="Forecast placeholders">
        {DAYS.map((day) => (
          <article className="forecast-day" key={day}>
            <h3>{day}</h3>
            <span className="forecast-day__line" />
            <span className="forecast-day__line forecast-day__line--short" />
            <p>
              {forecastReady
                ? "Window matching is ready; forecast cards land in Phase 4"
                : "Awaiting forecast feeds"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
