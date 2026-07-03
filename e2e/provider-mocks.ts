import type { Page } from "@playwright/test";

import {
  MARINE_RESPONSE,
  WEATHER_RESPONSE,
} from "../src/test/fixtures/providers";

function noaaResponseForToday() {
  const base = Date.now();
  const event = (offsetHours: number, height: string, type: "H" | "L") => {
    const instant = new Date(base + offsetHours * 60 * 60 * 1_000);
    return {
      t: instant.toISOString().slice(0, 16).replace("T", " "),
      v: height,
      type,
    };
  };

  return {
    predictions: [
      event(-6, "0.10", "L"),
      event(0, "1.02", "H"),
      event(6, "0.08", "L"),
      event(12, "1.08", "H"),
      event(18, "0.06", "L"),
    ],
  };
}

export async function mockSuccessfulProviders(page: Page): Promise<void> {
  await page.route("https://api.open-meteo.com/**", async (route) => {
    await route.fulfill({ json: WEATHER_RESPONSE });
  });
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    await route.fulfill({ json: MARINE_RESPONSE });
  });
  await page.route(
    "https://api.tidesandcurrents.noaa.gov/**",
    async (route) => {
      await route.fulfill({ json: noaaResponseForToday() });
    },
  );
}
