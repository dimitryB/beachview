import { useEffect, useRef } from "react";

import type { BeachDataState, ProviderState } from "@/types/domain";

interface DataUpdateAnnouncerProps {
  data: BeachDataState;
}

interface ProviderSnapshot {
  fetchedAt: string | null;
  isRefreshing: boolean;
  status: ProviderState<unknown>["status"];
}

interface Snapshot {
  marine: ProviderSnapshot;
  tides: ProviderSnapshot;
  weather: ProviderSnapshot;
}

function providerSnapshot(state: ProviderState<unknown>): ProviderSnapshot {
  return {
    fetchedAt: state.fetchedAt,
    isRefreshing: state.isRefreshing,
    status: state.status,
  };
}

function snapshot(data: BeachDataState): Snapshot {
  return {
    weather: providerSnapshot(data.weather),
    marine: providerSnapshot(data.marine),
    tides: providerSnapshot(data.tides),
  };
}

function completedRefresh(
  previous: ProviderSnapshot,
  current: ProviderSnapshot,
): boolean {
  if (current.status !== "fresh" || current.isRefreshing) {
    return false;
  }

  return (
    previous.status !== "fresh" ||
    previous.isRefreshing ||
    previous.fetchedAt !== current.fetchedAt
  );
}

export function DataUpdateAnnouncer({ data }: DataUpdateAnnouncerProps) {
  const previousRef = useRef<Snapshot>(snapshot(data));
  const liveRegionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const previous = previousRef.current;
    const current = snapshot(data);
    const messages: string[] = [];

    if (completedRefresh(previous.weather, current.weather)) {
      messages.push("Weather data updated.");
    }
    if (completedRefresh(previous.marine, current.marine)) {
      messages.push("Marine data updated.");
    }
    if (completedRefresh(previous.tides, current.tides)) {
      messages.push("NOAA tide predictions updated.");
    }

    previousRef.current = current;

    if (messages.length > 0 && liveRegionRef.current) {
      // Replacing the text node lets assistive technology announce a repeated
      // message after a later manual refresh without adding React render state.
      liveRegionRef.current.replaceChildren(messages.join(" "));
    }
  }, [data]);

  return (
    <p
      aria-atomic="true"
      aria-live="polite"
      className="sr-only"
      ref={liveRegionRef}
      role="status"
    />
  );
}
