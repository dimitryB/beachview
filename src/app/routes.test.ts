import { readView, viewHref } from "@/app/routes";

describe("routes", () => {
  it.each(["", "?view=swimming", "?view=unknown"])(
    "defaults %s to Swimming",
    (search) => {
      expect(readView(search)).toBe("swimming");
    },
  );

  it("reads and writes the Fishing view", () => {
    expect(readView("?view=fishing")).toBe("fishing");
    expect(viewHref("fishing")).toBe("?view=fishing");
  });

  it("reads and writes the Config view", () => {
    expect(readView("?view=config")).toBe("config");
    expect(viewHref("config")).toBe("?view=config");
  });
});
