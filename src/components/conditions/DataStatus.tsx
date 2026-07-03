import { formatEasternDateTime, formatRelativeAge } from "@/components/format";
import { useCurrentTime } from "@/hooks/use-current-time";
import type { ProviderState } from "@/types/domain";

interface DataStatusProps {
  label: string;
  state: ProviderState<unknown>;
}

export function DataStatus({ label, state }: DataStatusProps) {
  const currentTime = useCurrentTime();
  let detail: string;

  if (state.status === "loading") {
    detail = "Loading";
  } else if (state.status === "error") {
    detail = "Unavailable";
  } else if (state.fetchedAt) {
    const age =
      currentTime === null
        ? null
        : formatRelativeAge(state.fetchedAt, currentTime);
    const prefix = state.status === "stale" ? "Cached" : "Updated";
    detail = age ? `${prefix} ${age}` : prefix;
  } else {
    detail = state.status;
  }

  if (state.isRefreshing && state.data) {
    detail = `${detail} · refreshing`;
  }

  const title = [
    state.fetchedAt
      ? `Fetched ${formatEasternDateTime(state.fetchedAt)}`
      : null,
    state.error,
  ]
    .filter((value): value is string => value !== null)
    .join(" · ");

  return (
    <span
      className={`data-status data-status--${state.status}`}
      title={title || undefined}
    >
      <span className="data-status__dot" aria-hidden="true" />
      <span>{label}</span>
      <span className="data-status__detail">{detail}</span>
      {state.fetchedAt ? (
        <span className="sr-only">
          Fetched {formatEasternDateTime(state.fetchedAt)}
        </span>
      ) : null}
      {state.error ? <span className="sr-only">{state.error}</span> : null}
    </span>
  );
}
