import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { WEATHER_RESPONSE } from "../src/test/fixtures/providers";
import { mockSuccessfulProviders } from "./provider-mocks";

const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_AA_TAGS)
    .analyze();
  const summary = results.violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown"}): ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");

  expect(results.violations, summary).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await mockSuccessfulProviders(page);
});

test("Swimming has no automated WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Swimming conditions, without the clutter.",
    }),
  ).toBeVisible();
  // The requested point renders in both the weather and marine source
  // cards; either one proves the provenance panel is present.
  await expect(page.getByText("36.7083, -75.8750").first()).toBeAttached();

  await expectNoAccessibilityViolations(page);
});

test("Fishing has no automated WCAG A/AA violations", async ({ page }) => {
  await page.goto("/?view=fishing");
  await expect(
    page.getByRole("heading", {
      name: "Fishing signals, ordered around the tide.",
    }),
  ).toBeVisible();
  await expect(page.locator(".tide-chart svg")).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test("Config has no automated WCAG A/AA violations", async ({ page }) => {
  await page.goto("/?view=config");
  await expect(
    page.getByRole("heading", {
      name: "Tune your comfort recommendations.",
    }),
  ).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test("a partial provider failure has no automated WCAG A/AA violations", async ({
  page,
}) => {
  await page.unroute("https://marine-api.open-meteo.com/**");
  await page.route("https://marine-api.open-meteo.com/**", async (route) => {
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto("/");
  await expect(
    page.getByText("marine data is unavailable", { exact: true }),
  ).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test("keyboard users can skip to content and change activity views", async ({
  page,
}) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  await page.getByRole("link", { name: "Fishing" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?view=fishing$/);
  await expect(page.getByRole("main")).toBeFocused();
});

test("content reflows without page overflow at a 320 px CSS viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(
    page.getByRole("heading", {
      name: "Conditions are not a safety determination.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
});

test("reduced motion disables loading animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.unroute("https://api.open-meteo.com/**");

  let releaseWeather: (() => void) | undefined;
  const weatherReleased = new Promise<void>((resolve) => {
    releaseWeather = resolve;
  });
  await page.route("https://api.open-meteo.com/**", async (route) => {
    await weatherReleased;
    await route.fulfill({ json: WEATHER_RESPONSE });
  });

  await page.goto("/");
  const airCard = page.locator(".condition-card").filter({ hasText: "Air" });
  const skeleton = airCard.locator(".condition-card__skeleton");

  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveCSS("animation-name", "none");
  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);

  releaseWeather?.();
});
