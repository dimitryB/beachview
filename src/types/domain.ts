export type IsoInstant = string;

export type DataSource =
  "open-meteo-weather" | "open-meteo-marine" | "noaa-tides" | "nws-alerts";

export type DataKind = "modeled" | "predicted" | "derived" | "official-alert";

export interface DataPoint<T> {
  value: T | null;
  validAt: IsoInstant;
  fetchedAt: IsoInstant;
  source: DataSource;
  kind: DataKind;
}

export interface GridLocation {
  requestedLatitude: number;
  requestedLongitude: number;
  returnedLatitude: number;
  returnedLongitude: number;
}

export interface CurrentWeather {
  airTemperatureC: DataPoint<number>;
  windSpeedKmh: DataPoint<number>;
  windDirectionDeg: DataPoint<number>;
  windGustKmh: DataPoint<number>;
  pressureHpa: DataPoint<number>;
  cloudCoverPct: DataPoint<number>;
  isDay: DataPoint<boolean>;
}

export interface WeatherForecastHour {
  validAt: IsoInstant;
  airTemperatureC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windGustKmh: number | null;
  pressureHpa: number | null;
  cloudCoverPct: number | null;
  directRadiationWm2: number | null;
  uvIndex: number | null;
}

export interface SolarDay {
  providerDate: string;
  sunriseAt: IsoInstant | null;
  sunsetAt: IsoInstant | null;
}

export interface WeatherDataset {
  source: "open-meteo-weather";
  fetchedAt: IsoInstant;
  grid: GridLocation;
  current: CurrentWeather;
  hourly: WeatherForecastHour[];
  solarDays: SolarDay[];
}

export interface CurrentMarine {
  waveHeightM: DataPoint<number>;
  wavePeriodS: DataPoint<number>;
  seaSurfaceTemperatureC: DataPoint<number>;
}

export interface MarineForecastHour {
  validAt: IsoInstant;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  seaSurfaceTemperatureC: number | null;
}

export interface MarineDataset {
  source: "open-meteo-marine";
  fetchedAt: IsoInstant;
  grid: GridLocation;
  current: CurrentMarine;
  hourly: MarineForecastHour[];
}

export type TideEventType = "high" | "low";

export interface TideEvent {
  id: string;
  type: TideEventType;
  validAt: IsoInstant;
  localDate: string;
  heightM: number;
  datum: "MLLW";
  source: "noaa-tides";
  kind: "predicted";
}

export interface TideDataset {
  source: "noaa-tides";
  fetchedAt: IsoInstant;
  stationId: string;
  stationName: string;
  datum: "MLLW";
  events: TideEvent[];
}

export interface OfficialAlert {
  id: string;
  headline: string;
  severity: string | null;
  effectiveAt: IsoInstant;
  expiresAt: IsoInstant;
  sourceUrl: string;
  source: "nws-alerts";
  kind: "official-alert";
}

export type ProviderStatus = "loading" | "fresh" | "stale" | "error";

export interface ProviderState<T> {
  status: ProviderStatus;
  data: T | null;
  error: string | null;
  fetchedAt: IsoInstant | null;
  isRefreshing: boolean;
}

export interface BeachDataState {
  weather: ProviderState<WeatherDataset>;
  marine: ProviderState<MarineDataset>;
  tides: ProviderState<TideDataset>;
}
