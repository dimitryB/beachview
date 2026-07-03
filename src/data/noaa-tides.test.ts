import { buildNoaaTidesUrl, parseNoaaTidesResponse } from "@/data/noaa-tides";
import { FETCHED_AT, NOAA_RESPONSE } from "@/test/fixtures/providers";

describe("NOAA tide adapter", () => {
  const now = new Date("2026-07-02T16:00:00.000Z");

  it("builds a buffered GMT request for the Sandbridge station", () => {
    const url = new URL(buildNoaaTidesUrl(now));

    expect(url.searchParams.get("begin_date")).toBe("20260701");
    expect(url.searchParams.get("end_date")).toBe("20260713");
    expect(url.searchParams.get("station")).toBe("8639428");
    expect(url.searchParams.get("datum")).toBe("MLLW");
    expect(url.searchParams.get("time_zone")).toBe("gmt");
    expect(url.searchParams.get("interval")).toBe("hilo");
    expect(url.searchParams.get("units")).toBe("metric");
  });

  it("normalizes predicted high and low events in meters", () => {
    const result = parseNoaaTidesResponse(NOAA_RESPONSE, FETCHED_AT, now);

    expect(result.stationId).toBe("8639428");
    expect(result.datum).toBe("MLLW");
    expect(result.events[0]).toMatchObject({
      type: "high",
      heightM: 1.044,
      validAt: "2026-07-01T21:46:00.000Z",
      source: "noaa-tides",
      kind: "predicted",
    });
  });

  it("assigns local dates correctly around midnight and DST", () => {
    const dstResponse = {
      predictions: [
        { t: "2026-11-01 03:30", v: "1.00", type: "H" },
        { t: "2026-11-01 06:30", v: "0.10", type: "L" },
      ],
    };
    const result = parseNoaaTidesResponse(
      dstResponse,
      FETCHED_AT,
      new Date("2026-10-31T16:00:00.000Z"),
    );

    expect(result.events.map((event) => event.localDate)).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("surfaces NOAA error objects returned with a successful response", () => {
    expect(() =>
      parseNoaaTidesResponse(
        { error: { message: "No Predictions data was found." } },
        FETCHED_AT,
        now,
      ),
    ).toThrow("No Predictions data was found.");
  });
});
