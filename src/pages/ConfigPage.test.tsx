import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SWIM_RULES } from "@/config/rules";
import { ConfigPage } from "@/pages/ConfigPage";

describe("ConfigPage", () => {
  it("submits a complete valid rule set", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => true);
    render(
      <ConfigPage onReset={() => true} onSave={onSave} rules={SWIM_RULES} />,
    );

    const waveInput = screen.getByRole("spinbutton", {
      name: "High-wave threshold",
    });
    await user.clear(waveInput);
    await user.type(waveInput, "0.8");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(onSave).toHaveBeenCalledWith({
      ...SWIM_RULES,
      waveHeightRedAboveM: 0.8,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Preferences saved");
  });

  it("rejects conflicting thresholds before writing storage", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => true);
    render(
      <ConfigPage onReset={() => true} onSave={onSave} rules={SWIM_RULES} />,
    );

    const coldInput = screen.getByRole("spinbutton", {
      name: "Cold-water threshold",
    });
    await user.clear(coldInput);
    await user.type(coldInput, "25");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "cold-water threshold must be lower",
    );
  });

  it("reports when browser persistence is unavailable", async () => {
    const user = userEvent.setup();
    render(
      <ConfigPage
        onReset={() => false}
        onSave={() => false}
        rules={SWIM_RULES}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "could not be saved in this browser",
    );

    await user.click(screen.getByRole("button", { name: "Restore defaults" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "browser storage is unavailable",
    );
  });
});
