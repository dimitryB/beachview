import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { mockSuccessfulProviders } from "./provider-mocks";

const capture = process.env.CAPTURE_RELEASE_SCREENSHOTS === "1";
const outputDirectory = resolve("release/screenshots");
const fixedNow = Date.parse("2026-07-02T18:00:00.000Z");

test.skip(!capture, "Run through npm run screenshots:release.");

test.beforeAll(async () => {
  await mkdir(outputDirectory, { recursive: true });
});

const captures = [
  { name: "mobile-swimming", width: 390, height: 844, view: "swimming" },
  { name: "mobile-fishing", width: 390, height: 844, view: "fishing" },
  { name: "tablet-swimming", width: 768, height: 1024, view: "swimming" },
  { name: "desktop-swimming", width: 1440, height: 1000, view: "swimming" },
  { name: "desktop-fishing", width: 1440, height: 1000, view: "fishing" },
] as const;

for (const captureCase of captures) {
  test(`captures ${captureCase.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: captureCase.width,
      height: captureCase.height,
    });
    await page.clock.setFixedTime(fixedNow);
    await mockSuccessfulProviders(page, fixedNow);
    await page.goto(`/?view=${captureCase.view}`);

    await expect(
      page.getByRole("heading", {
        name:
          captureCase.view === "fishing"
            ? "Fishing signals, ordered around the tide."
            : "Swimming conditions, without the clutter.",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: resolve(outputDirectory, `${captureCase.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}
