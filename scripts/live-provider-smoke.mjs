const BEACH = {
  latitude: 36.6917,
  longitude: -75.92,
  noaaStation: "8639428",
};

const WEATHER_CURRENT = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "cloud_cover",
  "is_day",
].join(",");
const WEATHER_HOURLY = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "cloud_cover",
  "direct_radiation",
  "uv_index",
].join(",");
const MARINE_VARIABLES = "wave_height,wave_period,sea_surface_temperature";

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function record(value, label) {
  invariant(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object.`,
  );
  return value;
}

function array(value, label) {
  invariant(Array.isArray(value), `${label} must be an array.`);
  return value;
}

function requireEqualLengths(label, values) {
  const lengths = values.map((value) => value.length);
  invariant(
    lengths.every((length) => length === lengths[0]),
    `${label} arrays are misaligned: ${lengths.join(", ")}.`,
  );
}

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function fetchJson(label, url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  invariant(response.ok, `${label} returned HTTP ${response.status}.`);
  return response.json();
}

function weatherUrl() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(BEACH.latitude));
  url.searchParams.set("longitude", String(BEACH.longitude));
  url.searchParams.set("current", WEATHER_CURRENT);
  url.searchParams.set("hourly", WEATHER_HOURLY);
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("forecast_days", "10");
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  return url;
}

function marineUrl() {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(BEACH.latitude));
  url.searchParams.set("longitude", String(BEACH.longitude));
  url.searchParams.set("current", MARINE_VARIABLES);
  url.searchParams.set("hourly", MARINE_VARIABLES);
  url.searchParams.set("forecast_days", "10");
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("length_unit", "metric");
  url.searchParams.set("velocity_unit", "kmh");
  url.searchParams.set("cell_selection", "sea");
  return url;
}

function noaaUrl() {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2);
  const url = new URL(
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  );
  url.searchParams.set("begin_date", yyyymmdd(start));
  url.searchParams.set("end_date", yyyymmdd(end));
  url.searchParams.set("station", BEACH.noaaStation);
  url.searchParams.set("product", "predictions");
  url.searchParams.set("datum", "MLLW");
  url.searchParams.set("time_zone", "gmt");
  url.searchParams.set("interval", "hilo");
  url.searchParams.set("units", "metric");
  url.searchParams.set("application", "VABeachCast");
  url.searchParams.set("format", "json");
  return url;
}

const [weatherValue, marineValue, noaaValue] = await Promise.all([
  fetchJson("Open-Meteo Weather", weatherUrl()),
  fetchJson("Open-Meteo Marine", marineUrl()),
  fetchJson("NOAA tides", noaaUrl()),
]);

const weather = record(weatherValue, "Weather response");
const weatherCurrent = record(weather.current, "Weather current");
const weatherHourly = record(weather.hourly, "Weather hourly");
const weatherUnits = record(weather.current_units, "Weather current units");
const weatherTimes = array(weatherHourly.time, "Weather hourly time");
requireEqualLengths("Weather hourly", [
  weatherTimes,
  array(weatherHourly.temperature_2m, "Weather hourly temperature"),
  array(weatherHourly.wind_speed_10m, "Weather hourly wind speed"),
  array(weatherHourly.pressure_msl, "Weather hourly pressure"),
]);
invariant(weatherTimes.length >= 24 * 9, "Weather coverage is under 9 days.");
invariant(
  weatherUnits.temperature_2m === "°C" &&
    weatherUnits.wind_speed_10m === "km/h" &&
    weatherUnits.pressure_msl === "hPa",
  "Weather current units are not the requested metric units.",
);
invariant(
  typeof weatherCurrent.time === "string",
  "Weather current time missing.",
);

const marine = record(marineValue, "Marine response");
const marineHourly = record(marine.hourly, "Marine hourly");
const marineUnits = record(marine.current_units, "Marine current units");
const marineTimes = array(marineHourly.time, "Marine hourly time");
requireEqualLengths("Marine hourly", [
  marineTimes,
  array(marineHourly.wave_height, "Marine hourly wave height"),
  array(marineHourly.wave_period, "Marine hourly wave period"),
  array(
    marineHourly.sea_surface_temperature,
    "Marine hourly sea-surface temperature",
  ),
]);
invariant(marineTimes.length >= 24 * 9, "Marine coverage is under 9 days.");
invariant(
  marineUnits.wave_height === "m" &&
    marineUnits.wave_period === "s" &&
    marineUnits.sea_surface_temperature === "°C",
  "Marine current units are not the requested metric units.",
);

const noaa = record(noaaValue, "NOAA response");
invariant(noaa.error === undefined, "NOAA returned an error object.");
const predictions = array(noaa.predictions, "NOAA predictions");
invariant(predictions.length >= 4, "NOAA returned fewer than four extrema.");
const predictionTypes = predictions.map(
  (value, index) => record(value, `NOAA prediction ${index}`).type,
);
invariant(
  predictionTypes.every(
    (type, index) =>
      (type === "H" || type === "L") &&
      (index === 0 || type !== predictionTypes[index - 1]),
  ),
  "NOAA high/low predictions do not alternate.",
);

console.log(
  [
    `Weather: ${weatherTimes.length} hourly records; grid ${weather.latitude}, ${weather.longitude}.`,
    `Marine: ${marineTimes.length} hourly records; grid ${marine.latitude}, ${marine.longitude}.`,
    `NOAA: ${predictions.length} alternating MLLW extrema for station ${BEACH.noaaStation}.`,
  ].join("\n"),
);
