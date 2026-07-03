import { act, render, screen } from "@testing-library/react";

import { DataStatus } from "@/components/conditions/DataStatus";
import type { ProviderState } from "@/types/domain";

const staleState: ProviderState<unknown> = {
  status: "stale",
  data: {},
  error: null,
  fetchedAt: "2026-07-02T12:00:00.000Z",
  isRefreshing: false,
};

describe("DataStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows cached age and exposes the exact Eastern timestamp", () => {
    render(<DataStatus label="Weather" state={staleState} />);

    const age = screen.getByText("Cached 4 h ago");
    const status = age.closest(".data-status");
    expect(status).toHaveAttribute(
      "title",
      expect.stringContaining("Jul 2, 2026"),
    );
    expect(status).toHaveAttribute("title", expect.stringContaining("8:00 AM"));
  });

  it("updates the visible age while the page remains open", () => {
    render(<DataStatus label="Weather" state={staleState} />);
    expect(screen.getByText("Cached 4 h ago")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1_000);
    });

    expect(screen.getByText("Cached 5 h ago")).toBeInTheDocument();
  });
});
