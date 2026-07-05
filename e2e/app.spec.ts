import { expect, test } from "@playwright/test";

import { mockSuccessfulProviders } from "./provider-mocks";

test.beforeEach(async ({ page }) => {
  await mockSuccessfulProviders(page);
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
  await expect(
    page.getByRole("link", { name: "Swimming", exact: true }),
  ).toHaveAttribute("aria-current", "page");
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

test("saves recommendation config and reapplies it after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Config" }).click();

  await expect(page).toHaveURL(/\?view=config$/);
  const waveInput = page.getByRole("spinbutton", {
    name: "High-wave threshold",
  });
  await waveInput.fill("0.4");
  await page
    .getByRole("spinbutton", { name: "Choppy minimum wave height" })
    .fill("0.5");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Using your values")).toBeVisible();

  await page.getByRole("link", { name: "Swimming", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--danger")
      .getByText("High waves"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--neutral")
      .getByText("Small short-period waves"),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--danger")
      .getByText("High waves"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current modeled conditions" })
      .locator(".condition-state--neutral")
      .getByText("Small short-period waves"),
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

  await page.getByRole("link", { name: "Config" }).click();
  const configDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(configDimensions.scrollWidth).toBeLessThanOrEqual(
    configDimensions.clientWidth,
  );
});
