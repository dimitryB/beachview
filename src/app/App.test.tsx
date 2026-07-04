import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "@/app/App";
import { RECOMMENDATION_CONFIG_STORAGE_KEY } from "@/config/recommendation-config";

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
    window.localStorage.clear();
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
    expect(
      screen.getByRole("heading", {
        name: "Conditions are not a safety determination.",
      }),
    ).toBeVisible();
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

  it("saves recommendation values locally and restores defaults", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Config" }));
    expect(window.location.search).toBe("?view=config");
    expect(
      screen.getByRole("heading", {
        name: "Tune your comfort recommendations.",
      }),
    ).toBeVisible();

    const waveInput = screen.getByRole("spinbutton", {
      name: "High-wave threshold",
    });
    await user.clear(waveInput);
    await user.type(waveInput, "0.7");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(
      screen.getByText(/Preferences saved. Swimming and fishing/),
    ).toBeVisible();
    expect(
      JSON.parse(
        window.localStorage.getItem(RECOMMENDATION_CONFIG_STORAGE_KEY) ?? "{}",
      ).rules.waveHeightRedAboveM,
    ).toBe(0.7);
    expect(screen.getByText("Using your values")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(waveInput).toHaveValue(1);
    expect(
      window.localStorage.getItem(RECOMMENDATION_CONFIG_STORAGE_KEY),
    ).toBeNull();
    expect(screen.getByText("Using defaults")).toBeVisible();
  });

  it("loads saved recommendation values on a later app mount", () => {
    window.localStorage.setItem(
      RECOMMENDATION_CONFIG_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        rules: {
          waveHeightRedAboveM: 0.8,
          wavePeriodRedBelowS: 7,
          waterColdBelowC: 20,
          waterWarmAboveC: 24,
          windWarningAtKmh: 20,
          windGustWarningAtKmh: 30,
          windStrongAtKmh: 35,
          windGustStrongAtKmh: 50,
          uvWarningAt: 6,
          directRadiationWarningAtWm2: 500,
          middayStartHour: 11,
          middayEndHour: 15,
          lateDayStartHour: 15,
          lateDayMinimumHours: 2,
          lowerExposureUvAtMost: 3,
          lowerExposureRadiationAtMostWm2: 200,
          lowerExposureCloudCoverAtLeastPct: 70,
        },
      }),
    );
    window.history.replaceState(null, "", "/?view=config");

    render(<App />);

    expect(
      screen.getByRole("spinbutton", { name: "High-wave threshold" }),
    ).toHaveValue(0.8);
    expect(screen.getByText("Using your values")).toBeVisible();
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

  it("keeps official safety sources ahead of either activity view", async () => {
    const user = userEvent.setup();
    render(<App />);

    const safety = screen.getByRole("complementary");
    const main = screen.getByRole("main");

    expect(
      safety.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "NWS Wakefield surf forecast" }),
    ).toHaveAttribute("href", expect.stringContaining("weather.gov"));
    expect(
      screen.getByRole("link", { name: "VDH swimming advisories" }),
    ).toHaveAttribute("href", expect.stringContaining("vdh.virginia.gov"));

    await user.click(screen.getByRole("link", { name: "Fishing" }));

    expect(
      screen.getByRole("heading", {
        name: "Conditions are not a safety determination.",
      }),
    ).toBeVisible();
  });
});
