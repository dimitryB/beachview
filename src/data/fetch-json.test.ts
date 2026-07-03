import { fetchJson, ProviderError } from "@/data/fetch-json";

describe("fetchJson", () => {
  it("returns parsed JSON with timing metadata", async () => {
    const fetchImpl = vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await fetchJson({
      provider: "open-meteo-weather",
      url: "https://example.test/weather",
      fetchImpl,
      retries: 0,
    });

    expect(result.data).toEqual({ ok: true });
    expect(result.fetchedAt).toMatch(/Z$/);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns a typed HTTP error without retrying a client error", async () => {
    const fetchImpl = vi.fn(async () =>
      Promise.resolve(new Response("bad request", { status: 400 })),
    ) as unknown as typeof fetch;

    await expect(
      fetchJson({
        provider: "open-meteo-weather",
        url: "https://example.test/weather",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "http",
      provider: "open-meteo-weather",
      status: 400,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a transient server error once", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ) as unknown as typeof fetch;

    await expect(
      fetchJson({
        provider: "open-meteo-marine",
        url: "https://example.test/marine",
        fetchImpl,
        retryDelayMs: 0,
      }),
    ).resolves.toMatchObject({ data: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports invalid JSON as a parse error", async () => {
    const fetchImpl = vi.fn(async () =>
      Promise.resolve(new Response("{", { status: 200 })),
    ) as unknown as typeof fetch;

    await expect(
      fetchJson({
        provider: "noaa-tides",
        url: "https://example.test/tides",
        fetchImpl,
        retries: 0,
      }),
    ).rejects.toMatchObject({ code: "parse", provider: "noaa-tides" });
  });

  it("aborts and reports a timeout", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    const request = fetchJson({
      provider: "open-meteo-weather",
      url: "https://example.test/slow",
      fetchImpl,
      timeoutMs: 1,
      retries: 0,
    });

    await expect(request).rejects.toBeInstanceOf(ProviderError);
    await expect(request).rejects.toMatchObject({ code: "timeout" });
  });

  it("reports a caller abort as aborted without retrying", async () => {
    const abortController = new AbortController();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    const request = fetchJson({
      provider: "open-meteo-weather",
      url: "https://example.test/slow",
      fetchImpl,
      retryDelayMs: 0,
      signal: abortController.signal,
    });

    abortController.abort();

    await expect(request).rejects.toBeInstanceOf(ProviderError);
    await expect(request).rejects.toMatchObject({
      code: "aborted",
      provider: "open-meteo-weather",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout during the body read as a timeout, not parse", async () => {
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => body,
      } as unknown as Response);
    }) as unknown as typeof fetch;

    await expect(
      fetchJson({
        provider: "noaa-tides",
        url: "https://example.test/slow-body",
        fetchImpl,
        timeoutMs: 1,
        retries: 0,
      }),
    ).rejects.toMatchObject({ code: "timeout", provider: "noaa-tides" });
  });
});
