import { expect, test } from "@playwright/test";

import { WEATHER_RESPONSE } from "../src/test/fixtures/providers";
import { mockSuccessfulProviders } from "./provider-mocks";

test.beforeEach(async ({ page }) => {
  await mockSuccessfulProviders(page);
});

test("successful providers render while a slow weather request is pending", async ({
  page,
}) => {
  await page.unroute("https://api.open-meteo.com/**");

  let releaseWeather: () => void = () => {};
  const weatherReleased = new Promise<void>((resolve) => {
    releaseWeather = resolve;
  });
  await page.route("https://api.open-meteo.com/**", async (route) => {
    await weatherReleased;
    await route.fulfill({ json: WEATHER_RESPONSE });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const currentConditions = page.getByRole("region", {
    name: "Current modeled conditions",
  });
  await expect(
    currentConditions.getByText("25.7", { exact: true }),
  ).toBeVisible();
  await expect(
    currentConditions
      .locator(".condition-card")
      .filter({ hasText: "Air" })
      .locator(".condition-card__skeleton"),
  ).toBeVisible();

  releaseWeather();

  await expect(
    currentConditions.getByText("31.8", { exact: true }),
  ).toBeVisible();
});

test("current conditions do not wait for the Swimming outlook chunk", async ({
  page,
}) => {
  let releaseOutlook: () => void = () => {};
  const outlookReleased = new Promise<void>((resolve) => {
    releaseOutlook = resolve;
  });
  await page.route("**/assets/SwimmingOutlook-*.js", async (route) => {
    await outlookReleased;
    await route.continue();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("25.7", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Preparing the swimming outlook",
    }),
  ).toBeVisible();

  releaseOutlook();

  await expect(
    page.getByRole("heading", { name: "Late-day swim windows" }),
  ).toBeVisible();
});

test("malformed marine data does not hide valid weather", async ({ page }) => {
  await page.unroute("https://marine-api.open-meteo.com/**");
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    await route.fulfill({ json: { unexpected: true } });
  });

  await page.goto("/");

  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(
    page.getByText("marine data is unavailable", { exact: true }),
  ).toBeVisible();
});

test("offline refresh retains cached values and marks them stale", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(page.getByText("25.7", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          localStorage.getItem("vabeachcast:provider:open-meteo-weather") !==
          null,
      ),
    )
    .toBe(true);

  await page.unroute("https://api.open-meteo.com/**");
  await page.unroute("https://marine-api.open-meteo.com/**");
  await page.unroute("https://api.tidesandcurrents.noaa.gov/**");
  await context.setOffline(true);

  const refresh = page.getByRole("button", { name: "Refresh" });
  await expect(refresh).toBeEnabled();
  await refresh.click();

  await expect(page.getByText("You’re offline.")).toBeVisible();
  await expect(page.getByText("Showing cached weather data")).toBeVisible();
  await expect(page.getByText("Showing cached marine data")).toBeVisible();
  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(page.getByText("25.7", { exact: true })).toBeVisible();
});

test("cached weather renders before a delayed reload refresh finishes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          localStorage.getItem("vabeachcast:provider:open-meteo-weather") !==
          null,
      ),
    )
    .toBe(true);

  await page.unroute("https://api.open-meteo.com/**");
  let releaseWeather: () => void = () => {};
  const weatherReleased = new Promise<void>((resolve) => {
    releaseWeather = resolve;
  });
  await page.route("https://api.open-meteo.com/**", async (route) => {
    await weatherReleased;
    await route.fulfill({ json: WEATHER_RESPONSE });
  });

  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refreshing" })).toBeDisabled();

  releaseWeather();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
});

test("a failed reload refresh retains and labels cached marine data", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("25.7", { exact: true })).toBeVisible();

  await page.unroute("https://marine-api.open-meteo.com/**");
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.reload();

  await expect(page.getByText("25.7", { exact: true })).toBeVisible();
  await expect(page.getByText("Showing cached marine data")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".data-status--stale")
      .getByText("Cached", { exact: false }),
  ).toBeVisible();
});

test("manual refresh replaces values and advances the cache timestamp", async ({
  page,
}) => {
  await page.unroute("https://api.open-meteo.com/**");
  const refreshedWeather = structuredClone(WEATHER_RESPONSE);
  refreshedWeather.current.temperature_2m = 29.4;
  let weatherRequests = 0;
  await page.route("https://api.open-meteo.com/**", async (route) => {
    weatherRequests += 1;
    await route.fulfill({
      json: weatherRequests === 1 ? WEATHER_RESPONSE : refreshedWeather,
    });
  });

  await page.goto("/");
  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  const initialFetchedAt = await page.evaluate(() => {
    const raw = localStorage.getItem("vabeachcast:provider:open-meteo-weather");
    return raw ? (JSON.parse(raw) as { fetchedAt: string }).fetchedAt : null;
  });

  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(page.getByText("29.4", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem(
          "vabeachcast:provider:open-meteo-weather",
        );
        return raw
          ? (JSON.parse(raw) as { fetchedAt: string }).fetchedAt
          : null;
      }),
    )
    .not.toBe(initialFetchedAt);
  expect(weatherRequests).toBe(2);
});

test("the production shell preconnects to all provider origins", async ({
  page,
}) => {
  await page.goto("/");

  const origins = await page
    .locator('link[rel="preconnect"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

  expect(origins).toEqual([
    "https://api.open-meteo.com",
    "https://marine-api.open-meteo.com",
    "https://api.tidesandcurrents.noaa.gov",
  ]);
});
