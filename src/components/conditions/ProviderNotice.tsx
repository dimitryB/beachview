import type { ProviderState } from "@/types/domain";

interface ProviderNoticeProps {
  label: string;
  onRetry: () => void;
  state: ProviderState<unknown>;
}

export function ProviderNotice({ label, onRetry, state }: ProviderNoticeProps) {
  if (state.status !== "error" && state.status !== "stale") {
    return null;
  }

  const hasCachedData = state.data !== null;
  const heading = hasCachedData
    ? `Showing cached ${label} data`
    : `${label} data is unavailable`;
  const detail =
    state.error ??
    (hasCachedData
      ? "The latest refresh did not complete."
      : "The provider did not return usable data.");

  return (
    <div
      className={`provider-notice provider-notice--${hasCachedData ? "stale" : "error"}`}
      role={hasCachedData ? "status" : "alert"}
    >
      <span className="provider-notice__icon" aria-hidden="true">
        {hasCachedData ? "△" : "!"}
      </span>
      <div>
        <strong>{heading}</strong>
        <span>{detail}</span>
      </div>
      <button
        className="provider-notice__retry"
        disabled={state.isRefreshing}
        onClick={onRetry}
        type="button"
      >
        {state.isRefreshing ? "Retrying" : "Retry"}
      </button>
    </div>
  );
}
