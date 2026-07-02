import type { MouseEvent } from "react";

import { viewHref, type AppView } from "@/app/routes";

interface PrimaryNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const ITEMS: ReadonlyArray<{ label: string; view: AppView }> = [
  { label: "Swimming", view: "swimming" },
  { label: "Fishing", view: "fishing" },
];

export function PrimaryNavigation({
  currentView,
  onNavigate,
}: PrimaryNavigationProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, view: AppView) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(view);
  };

  return (
    <nav className="primary-nav" aria-label="Beach activity">
      {ITEMS.map(({ label, view }) => (
        <a
          aria-current={currentView === view ? "page" : undefined}
          href={viewHref(view)}
          key={view}
          onClick={(event) => handleClick(event, view)}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
