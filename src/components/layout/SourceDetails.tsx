import { BEACH } from "@/config/location";
import type {
  BeachDataState,
  GridLocation,
  MarineDataset,
  TideDataset,
  WeatherDataset,
} from "@/types/domain";

interface SourceDetailsProps {
  data: BeachDataState;
}

function coordinatePair(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function returnedGrid(dataset: MarineDataset | WeatherDataset | null): string {
  return dataset
    ? coordinatePair(
        dataset.grid.returnedLatitude,
        dataset.grid.returnedLongitude,
      )
    : "Available after this feed loads";
}

function requestedGrid(grid: GridLocation | undefined): string {
  return coordinatePair(
    grid?.requestedLatitude ?? BEACH.latitude,
    grid?.requestedLongitude ?? BEACH.longitude,
  );
}

function tideStation(tides: TideDataset | null): string {
  const stationName = tides?.stationName ?? "Sandbridge";
  const stationId = tides?.stationId ?? BEACH.noaaTideStation;
  return `${stationName} (${stationId})`;
}

export function SourceDetails({ data }: SourceDetailsProps) {
  return (
    <section
      aria-labelledby="source-details-heading"
      className="source-details"
    >
      <div className="source-details__heading">
        <p className="eyebrow">Provenance and limits</p>
        <h2 id="source-details-heading">Know what each value represents.</h2>
        <p>
          Forecast values are modeled, NOAA high and low tides are predictions,
          and the curve between tide events is an estimate.
        </p>
      </div>

      <div className="source-details__grid">
        <details className="source-card">
          <summary>
            <span>Open-Meteo Weather</span>
            <span className="source-card__kind">Modeled forecast</span>
          </summary>
          <div className="source-card__body">
            <p>
              Modeled air, wind, pressure, cloud, UV, and radiation values for
              the forecast grid returned near Sandbridge.
            </p>
            <dl>
              <div>
                <dt>Requested point</dt>
                <dd>{requestedGrid(data.weather.data?.grid)}</dd>
              </div>
              <div>
                <dt>Returned grid</dt>
                <dd>{returnedGrid(data.weather.data)}</dd>
              </div>
            </dl>
            <a href="https://open-meteo.com/en/docs" rel="noreferrer">
              Open-Meteo Weather API
            </a>
          </div>
        </details>

        <details className="source-card">
          <summary>
            <span>Open-Meteo Marine</span>
            <span className="source-card__kind">Modeled offshore grid</span>
          </summary>
          <div className="source-card__body">
            <p>
              Modeled waves, period, and sea-surface temperature. The returned
              marine cell can be offshore and is not an on-beach observation or
              a shallow surf-zone reading.
            </p>
            <dl>
              <div>
                <dt>Requested point</dt>
                <dd>{requestedGrid(data.marine.data?.grid)}</dd>
              </div>
              <div>
                <dt>Returned marine grid</dt>
                <dd>{returnedGrid(data.marine.data)}</dd>
              </div>
            </dl>
            <a href="https://open-meteo.com/en/docs/marine-weather-api">
              Open-Meteo Marine API
            </a>
          </div>
        </details>

        <details className="source-card">
          <summary>
            <span>NOAA CO-OPS</span>
            <span className="source-card__kind">Predicted high/low tides</span>
          </summary>
          <div className="source-card__body">
            <p>
              Official astronomical high and low predictions. Heights and phases
              shown between those extrema are VABeachCast estimates, not
              observed water levels.
            </p>
            <dl>
              <div>
                <dt>Station</dt>
                <dd>{tideStation(data.tides.data)}</dd>
              </div>
              <div>
                <dt>Datum</dt>
                <dd>
                  {data.tides.data?.datum ?? BEACH.noaaTideDatum} · Mean Lower
                  Low Water
                </dd>
              </div>
            </dl>
            <a
              href="https://api.tidesandcurrents.noaa.gov/api/prod/"
              rel="noreferrer"
            >
              NOAA CO-OPS Data API
            </a>
          </div>
        </details>
      </div>

      <p className="source-details__attribution">
        Weather and marine data by{" "}
        <a href="https://open-meteo.com/" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (CC BY 4.0). Tide predictions by{" "}
        <a href="https://tidesandcurrents.noaa.gov/" rel="noreferrer">
          NOAA CO-OPS
        </a>
        .
      </p>
    </section>
  );
}
