import { useEffect, useState } from "react";

import { SafetyNotice } from "@/components/alerts/SafetyNotice";
import { AppHeader } from "@/components/layout/AppHeader";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";
import { readView, viewHref, type AppView } from "@/app/routes";
import { FishingPage } from "@/pages/FishingPage";
import { SwimmingPage } from "@/pages/SwimmingPage";

export function App() {
  const [view, setView] = useState<AppView>(() =>
    readView(window.location.search),
  );

  useEffect(() => {
    const handlePopState = () => setView(readView(window.location.search));

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextView: AppView) => {
    if (nextView === view) {
      return;
    }

    window.history.pushState(null, "", viewHref(nextView));
    setView(nextView);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to conditions
      </a>
      <div className="app-shell">
        <AppHeader />
        <SafetyNotice />
        <PrimaryNavigation currentView={view} onNavigate={navigate} />
        <main id="main-content" tabIndex={-1}>
          {view === "swimming" ? <SwimmingPage /> : <FishingPage />}
        </main>
        <footer className="site-footer">
          <p>Conditions inform your plans; official guidance comes first.</p>
          <p className="site-footer__meta">
            Sandbridge Beach · Metric units · Eastern Time
          </p>
        </footer>
      </div>
    </>
  );
}
