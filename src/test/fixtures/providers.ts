export const FETCHED_AT = "2026-07-02T22:16:00.000Z";

export const WEATHER_RESPONSE = {
  latitude: 36.66708,
  longitude: -75.92908,
  current_units: {
    time: "iso8601",
    interval: "seconds",
    temperature_2m: "°C",
    wind_speed_10m: "km/h",
    wind_direction_10m: "°",
    wind_gusts_10m: "km/h",
    pressure_msl: "hPa",
    cloud_cover: "%",
    is_day: "",
  },
  current: {
    time: "2026-07-02T22:15",
    interval: 900,
    temperature_2m: 31.8,
    wind_speed_10m: 18.5,
    wind_direction_10m: 173,
    wind_gusts_10m: 23.8,
    pressure_msl: 1017.5,
    cloud_cover: 5,
    is_day: 1,
  },
  hourly_units: {
    time: "iso8601",
    temperature_2m: "°C",
    wind_speed_10m: "km/h",
    wind_direction_10m: "°",
    wind_gusts_10m: "km/h",
    pressure_msl: "hPa",
    cloud_cover: "%",
    direct_radiation: "W/m²",
    uv_index: "",
  },
  hourly: {
    time: ["2026-07-02T22:00", "2026-07-02T23:00"],
    temperature_2m: [31.8, null],
    wind_speed_10m: [18.5, 17.2],
    wind_direction_10m: [173, 180],
    wind_gusts_10m: [23.8, 22.1],
    pressure_msl: [1017.5, 1017.4],
    cloud_cover: [5, 8],
    direct_radiation: [380, 210],
    uv_index: [3.2, 1.7],
  },
  daily_units: {
    time: "iso8601",
    sunrise: "iso8601",
    sunset: "iso8601",
  },
  daily: {
    time: ["2026-07-02", "2026-07-03"],
    sunrise: ["2026-07-02T09:49", "2026-07-03T09:49"],
    sunset: ["2026-07-03T00:26", "2026-07-04T00:26"],
  },
};

export const MARINE_RESPONSE = {
  latitude: 36.708336,
  longitude: -75.87499,
  current_units: {
    time: "iso8601",
    interval: "seconds",
    wave_height: "m",
    wave_period: "s",
    sea_surface_temperature: "°C",
  },
  current: {
    time: "2026-07-02T22:15",
    interval: 900,
    wave_height: 0.48,
    wave_period: 4.85,
    sea_surface_temperature: 25.7,
  },
  hourly_units: {
    time: "iso8601",
    wave_height: "m",
    wave_period: "s",
    sea_surface_temperature: "°C",
  },
  hourly: {
    time: ["2026-07-02T22:00", "2026-07-02T23:00"],
    wave_height: [0.48, null],
    wave_period: [4.85, 5.1],
    sea_surface_temperature: [25.7, 25.6],
  },
};

export const NOAA_RESPONSE = {
  predictions: [
    { t: "2026-07-01 21:46", v: "1.044", type: "H" },
    { t: "2026-07-02 04:02", v: "0.039", type: "L" },
    { t: "2026-07-02 10:07", v: "0.86", type: "H" },
    { t: "2026-07-02 15:51", v: "0.126", type: "L" },
    { t: "2026-07-02 22:15", v: "1.094", type: "H" },
    { t: "2026-07-03 04:39", v: "0.034", type: "L" },
  ],
};
