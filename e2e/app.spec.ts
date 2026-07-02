import { expect, test } from "@playwright/test";

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
});
