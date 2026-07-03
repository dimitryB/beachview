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

function wait(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function fetchOnce({
  provider,
  url,
  timeoutMs,
  fetchImpl,
}: Required<
  Pick<JsonFetchRequest, "provider" | "url" | "timeoutMs" | "fetchImpl">
>): Promise<JsonFetchResult> {
  const controller = new AbortController();
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

    if (controller.signal.aborted) {
      throw new ProviderError(
        provider,
        "timeout",
        `${provider} did not respond within ${timeoutMs} ms.`,
        { cause: error },
      );
    }

    throw new ProviderError(
      provider,
      "network",
      `${provider} could not be reached.`,
      { cause: error },
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const fetchJson: JsonFetcher = async ({
  provider,
  url,
  timeoutMs = 8_000,
  retries = 1,
  retryDelayMs = 200,
  fetchImpl = fetch,
}) => {
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchOnce({ provider, url, timeoutMs, fetchImpl });
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

      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw (
    lastError ??
    new ProviderError(provider, "network", `${provider} failed unexpectedly.`)
  );
};
