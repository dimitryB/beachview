import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "@/app/App";

vi.mock("@/hooks/use-beach-data", () => ({
  useBeachData: () => ({
    weather: {
      status: "loading",
      data: null,
      error: null,
      fetchedAt: null,
      isRefreshing: false,
    },
    marine: {
      status: "loading",
      data: null,
      error: null,
      fetchedAt: null,
      isRefreshing: false,
    },
    tides: {
      status: "loading",
      data: null,
      error: null,
      fetchedAt: null,
      isRefreshing: false,
    },
    refreshAll: vi.fn(async () => Promise.resolve()),
    refreshMarine: vi.fn(async () => Promise.resolve()),
    refreshTides: vi.fn(async () => Promise.resolve()),
    refreshWeather: vi.fn(async () => Promise.resolve()),
  }),
}));

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("opens on the Swimming view", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Swimming conditions, without the clutter.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Swimming" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigates to Fishing without a full page reload", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Fishing" }));

    expect(
      screen.getByRole("heading", {
        name: "Fishing signals, ordered around the tide.",
      }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?view=fishing");
  });

  it("does not steal focus on initial load", () => {
    render(<App />);

    expect(document.title).toBe("Swimming · VABeachCast · Sandbridge Beach");
    expect(screen.getByRole("main")).not.toHaveFocus();
  });

  it("moves focus to main content and updates the title on navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Fishing" }));

    expect(document.title).toBe("Fishing · VABeachCast · Sandbridge Beach");
    expect(screen.getByRole("main")).toHaveFocus();

    await user.click(screen.getByRole("link", { name: "Swimming" }));

    expect(document.title).toBe("Swimming · VABeachCast · Sandbridge Beach");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("responds to browser history changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Fishing" }));

    act(() => {
      window.history.replaceState(null, "", "?view=swimming");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.getByRole("heading", {
        name: "Swimming conditions, without the clutter.",
      }),
    ).toBeVisible();
  });

  it("announces offline fallback behavior", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<App />);
    expect(screen.getByText("You’re offline.")).toBeVisible();
    expect(screen.getByText(/Showing saved conditions/)).toBeVisible();
  });
});
