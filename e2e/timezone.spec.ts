import { expect, test } from "@playwright/test";

import { mockSuccessfulProviders } from "./provider-mocks";

test.use({ timezoneId: "America/Los_Angeles" });

test("keeps displayed provider times in Eastern time on a Pacific device", async ({
  page,
}) => {
  await mockSuccessfulProviders(page);
  await page.goto("/");

  const currentConditions = page.getByRole("region", {
    name: "Current modeled conditions",
  });
  await expect(
    currentConditions.getByText(/valid 6:15 PM EDT/).first(),
  ).toBeVisible();
});
