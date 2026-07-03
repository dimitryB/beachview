import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProviderNotice } from "@/components/conditions/ProviderNotice";
import type { ProviderState } from "@/types/domain";

describe("ProviderNotice", () => {
  it("explains stale cached data and retries only its provider", async () => {
    const onRetry = vi.fn();
    const state: ProviderState<unknown> = {
      status: "stale",
      data: {},
      error: "Marine refresh timed out.",
      fetchedAt: "2026-07-02T12:00:00.000Z",
      isRefreshing: false,
    };
    const user = userEvent.setup();

    render(<ProviderNotice label="marine" onRetry={onRetry} state={state} />);
    expect(screen.getByText("Showing cached marine data")).toBeVisible();
    expect(screen.getByText("Marine refresh timed out.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("uses an alert when no provider data is available", () => {
    const state: ProviderState<unknown> = {
      status: "error",
      data: null,
      error: "Provider unavailable.",
      fetchedAt: null,
      isRefreshing: false,
    };

    render(<ProviderNotice label="weather" onRetry={vi.fn()} state={state} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "weather data is unavailable",
    );
  });
});
