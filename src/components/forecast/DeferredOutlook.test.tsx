import { render, screen } from "@testing-library/react";

import { DeferredOutlook } from "@/components/forecast/DeferredOutlook";

describe("DeferredOutlook", () => {
  it("keeps a labeled, busy forecast region in the layout", () => {
    render(<DeferredOutlook activity="swimming" />);

    expect(
      screen.getByRole("region", {
        name: "Preparing the swimming outlook",
      }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the extended swimming forecast presentation.",
    );
  });
});
