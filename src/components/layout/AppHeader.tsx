import { BEACH } from "@/config/location";

export function AppHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="?view=swimming" aria-label="VABeachCast home">
        <svg
          className="brand__mark"
          aria-hidden="true"
          viewBox="0 0 48 48"
          width="48"
          height="48"
        >
          <rect width="48" height="48" rx="14" />
          <path d="M7 27c6 0 6-8 12-8s6 8 12 8 6-8 10-8" />
          <path d="M8 35h32" />
        </svg>
        <span>
          <span className="brand__name">VABeachCast</span>
          <span className="brand__place">
            {BEACH.name} · {BEACH.region}
          </span>
        </span>
      </a>
      <p className="scope-badge">
        <span aria-hidden="true">●</span> Metric · Eastern Time
      </p>
    </header>
  );
}
