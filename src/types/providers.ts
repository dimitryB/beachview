import type { DataSource, IsoInstant } from "@/types/domain";

export type ProviderErrorCode =
  "timeout" | "network" | "http" | "parse" | "validation";

export interface JsonFetchRequest {
  provider: DataSource;
  url: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export interface JsonFetchResult {
  data: unknown;
  fetchedAt: IsoInstant;
  durationMs: number;
}

export type JsonFetcher = (
  request: JsonFetchRequest,
) => Promise<JsonFetchResult>;
