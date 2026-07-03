import type {
  JsonFetcher,
  JsonFetchRequest,
  JsonFetchResult,
  ProviderErrorCode,
} from "@/types/providers";
import type { DataSource } from "@/types/domain";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: DataSource;
  readonly status: number | null;

  constructor(
    provider: DataSource,
    code: ProviderErrorCode,
    message: string,
    options: { cause?: unknown; status?: number } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.provider = provider;
    this.code = code;
    this.status = options.status ?? null;
  }
}

function isRetryable(error: ProviderError): boolean {
  if (error.code === "network" || error.code === "timeout") {
    return true;
  }

  return (
    error.code === "http" &&
    (error.status === 429 || (error.status !== null && error.status >= 500))
  );
}

function abortedError(provider: DataSource, cause?: unknown): ProviderError {
  return new ProviderError(
    provider,
    "aborted",
    `${provider} request was aborted.`,
    { cause },
  );
}

function timeoutError(
  provider: DataSource,
  timeoutMs: number,
  cause?: unknown,
): ProviderError {
  return new ProviderError(
    provider,
    "timeout",
    `${provider} did not respond within ${timeoutMs} ms.`,
    { cause },
  );
}

function wait(
  provider: DataSource,
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(abortedError(provider, signal.reason));
  }

  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(abortedError(provider, signal?.reason));
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

type FetchOnceRequest = Required<
  Pick<JsonFetchRequest, "provider" | "url" | "timeoutMs" | "fetchImpl">
> &
  Pick<JsonFetchRequest, "signal">;

async function fetchOnce({
  provider,
  url,
  timeoutMs,
  fetchImpl,
  signal,
}: FetchOnceRequest): Promise<JsonFetchResult> {
  if (signal?.aborted) {
    throw abortedError(provider, signal.reason);
  }

  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ProviderError(
        provider,
        "http",
        `${provider} returned HTTP ${response.status}.`,
        { status: response.status },
      );
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch (error) {
      if (signal?.aborted) {
        throw abortedError(provider, error);
      }

      if (controller.signal.aborted) {
        throw timeoutError(provider, timeoutMs, error);
      }

      throw new ProviderError(
        provider,
        "parse",
        `${provider} returned invalid JSON.`,
        { cause: error },
      );
    }

    return {
      data,
      fetchedAt: new Date().toISOString(),
      durationMs: Math.max(0, performance.now() - startedAt),
    };
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }

    if (signal?.aborted) {
      throw abortedError(provider, error);
    }

    if (controller.signal.aborted) {
      throw timeoutError(provider, timeoutMs, error);
    }

    throw new ProviderError(
      provider,
      "network",
      `${provider} could not be reached.`,
      { cause: error },
    );
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}

export const fetchJson: JsonFetcher = async ({
  provider,
  url,
  timeoutMs = 8_000,
  retries = 1,
  retryDelayMs = 200,
  fetchImpl = fetch,
  signal,
}) => {
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchOnce({ provider, url, timeoutMs, fetchImpl, signal });
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(provider, "network", `${provider} failed.`, {
              cause: error,
            });

      lastError = providerError;

      if (attempt === retries || !isRetryable(providerError)) {
        throw providerError;
      }

      await wait(provider, retryDelayMs * (attempt + 1), signal);
    }
  }

  throw (
    lastError ??
    new ProviderError(provider, "network", `${provider} failed unexpectedly.`)
  );
};
