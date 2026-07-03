import { render, screen } from "@testing-library/react";

import { ConditionCard } from "@/components/conditions/ConditionCard";

describe("ConditionCard", () => {
  it("keeps value, unit, semantic label, explanation, and source together", () => {
    render(
      <ConditionCard
        assessment={{
          tone: "danger",
          label: "Choppy",
          explanation: "Below 7 s.",
        }}
        description="Below the configured 7 s period threshold."
        label="Period"
        meta="Open-Meteo Marine modeled · valid 6:15 PM EDT"
        status="fresh"
        unit="s"
        value="4.9"
      />,
    );

    const card = screen.getByText("Period").closest("article");
    expect(card).toHaveClass("condition-card--tone-danger");
    expect(card).toHaveTextContent("4.9s");
    expect(card).toHaveTextContent("Choppy");
    expect(card).toHaveTextContent("Below the configured 7 s");
    expect(card).toHaveTextContent("Open-Meteo Marine modeled");
  });

  it("uses a layout-stable loading skeleton and a textual cue", () => {
    const { container } = render(
      <ConditionCard
        assessment={{
          tone: "info",
          label: "Modeled",
          explanation: "Modeled value.",
        }}
        description="Loading marine data."
        label="Water"
        status="loading"
        unit="°C"
        value={null}
      />,
    );

    expect(screen.getAllByText("Loading")).toHaveLength(2);
    expect(
      container.querySelector(".condition-card__skeleton"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading the latest provider data.")).toBeVisible();
  });
});
