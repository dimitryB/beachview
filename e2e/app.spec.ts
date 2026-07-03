import { expect, test } from "@playwright/test";

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

test.beforeEach(async ({ page }) => {
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
});

test("opens on the Swimming view", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "VABeachCast home" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Swimming conditions, without the clutter.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Swimming" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("25.7", { exact: true })).toBeVisible();
  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--alert")
      .getByText("Warm-water alert"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--danger")
      .getByText("Choppy"),
  ).toBeVisible();
});

test("switches to the Fishing view", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Fishing" }).click();

  await expect(page).toHaveURL(/\?view=fishing$/);
  await expect(
    page.getByRole("heading", {
      name: "Fishing signals, ordered around the tide.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Fishing" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByText("Near high slack", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current fishing inputs" })
      .locator(".condition-state--unavailable")
      .getByText("Tendency unavailable"),
  ).toBeVisible();

  // Phase 4: the tide chart replaces the placeholder and the fishing
  // timeline renders derived movement periods from the mocked NOAA events.
  await expect(
    page.getByRole("heading", { name: "Today and tomorrow at Sandbridge" }),
  ).toBeVisible();
  await expect(page.locator(".tide-chart svg")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fishing timeline" }),
  ).toBeVisible();
  await expect(
    page.getByText("Stronger estimated", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".fishing-entry--tide-event").first(),
  ).toBeVisible();
});

test("keeps weather visible when the marine provider fails", async ({
  page,
}) => {
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto("/");

  await expect(page.getByText("31.8", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".data-status--error")
      .getByText("Unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("marine data is unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
});

test("browser back and forward preserve the selected view", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Fishing" }).click();
  await expect(page).toHaveURL(/\?view=fishing$/);

  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "Swimming conditions, without the clutter.",
    }),
  ).toBeVisible();

  await page.goForward();
  await expect(
    page.getByRole("heading", {
      name: "Fishing signals, ordered around the tide.",
    }),
  ).toBeVisible();
});

test("current conditions fit a 320 px viewport without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await page.getByRole("link", { name: "Fishing" }).click();
  const fishingDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(fishingDimensions.scrollWidth).toBeLessThanOrEqual(
    fishingDimensions.clientWidth,
  );
});
