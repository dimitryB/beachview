import { useEffect, useState } from "react";

const CLOCK_INTERVAL_MS = 60 * 1_000;

export function useCurrentTime(): number | null {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();

    const interval = window.setInterval(updateCurrentTime, CLOCK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return currentTime;
}
