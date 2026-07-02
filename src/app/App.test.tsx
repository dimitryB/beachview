import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "@/app/App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
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
});
