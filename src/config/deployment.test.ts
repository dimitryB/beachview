import { deploymentBase } from "@/config/deployment";

describe("deployment base path", () => {
  it.each([
    [undefined, "/"],
    ["", "/"],
    ["/", "/"],
    ["beachview", "/beachview/"],
    ["/beachview", "/beachview/"],
    ["/beachview/", "/beachview/"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(deploymentBase(input)).toBe(expected);
  });
});
