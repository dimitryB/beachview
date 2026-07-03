import { BEACH } from "@/config/location";
import type { ProviderState } from "@/types/domain";

interface DataStatusProps {
  label: string;
  state: ProviderState<unknown>;
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BEACH.timezone,
  hour: "numeric",
  minute: "2-digit",
});

export function DataStatus({ label, state }: DataStatusProps) {
  let detail: string;

  if (state.status === "loading") {
    detail = "Loading";
  } else if (state.status === "error") {
    detail = "Unavailable";
  } else if (state.fetchedAt) {
    const time = timeFormatter.format(new Date(state.fetchedAt));
    detail =
      state.status === "stale" ? `Cached · ${time}` : `Updated · ${time}`;
  } else {
    detail = state.status;
  }

  if (state.isRefreshing && state.data) {
    detail = `${detail} · refreshing`;
  }

  return (
    <span
      className={`data-status data-status--${state.status}`}
      title={state.error ?? undefined}
    >
      <span className="data-status__dot" aria-hidden="true" />
      <span>{label}</span>
      <span className="data-status__detail">{detail}</span>
      {state.error ? <span className="sr-only">{state.error}</span> : null}
    </span>
  );
}
