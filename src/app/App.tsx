import { useEffect, useRef, useState } from "react";

import { SafetyNotice } from "@/components/alerts/SafetyNotice";
import { OfflineNotice } from "@/components/conditions/OfflineNotice";
import { AppHeader } from "@/components/layout/AppHeader";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";
import { readView, viewHref, type AppView } from "@/app/routes";
import { useBeachData } from "@/hooks/use-beach-data";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { FishingPage } from "@/pages/FishingPage";
import { SwimmingPage } from "@/pages/SwimmingPage";

const VIEW_TITLES: Record<AppView, string> = {
  swimming: "Swimming · VABeachCast · Sandbridge Beach",
  fishing: "Fishing · VABeachCast · Sandbridge Beach",
};

export function App() {
  const [view, setView] = useState<AppView>(() =>
    readView(window.location.search),
  );
  const beachData = useBeachData();
  const isOnline = useOnlineStatus();
  const mainRef = useRef<HTMLElement>(null);
  const previousViewRef = useRef<AppView | null>(null);

  useEffect(() => {
    const handlePopState = () => setView(readView(window.location.search));

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.title = VIEW_TITLES[view];

    // Only move focus when the view actually changed; leave initial load and
    // same-view history restores alone.
    if (previousViewRef.current !== null && previousViewRef.current !== view) {
      mainRef.current?.focus();
    }
    previousViewRef.current = view;
  }, [view]);

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
        <AppHeader
          isRefreshing={
            beachData.weather.isRefreshing ||
            beachData.marine.isRefreshing ||
            beachData.tides.isRefreshing
          }
          onRefresh={() => void beachData.refreshAll()}
        />
        <SafetyNotice />
        {!isOnline ? <OfflineNotice /> : null}
        <PrimaryNavigation currentView={view} onNavigate={navigate} />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {view === "swimming" ? (
            <SwimmingPage
              data={beachData}
              onRetryMarine={() => void beachData.refreshMarine()}
              onRetryTides={() => void beachData.refreshTides()}
              onRetryWeather={() => void beachData.refreshWeather()}
            />
          ) : (
            <FishingPage
              data={beachData}
              onRetryTides={() => void beachData.refreshTides()}
              onRetryWeather={() => void beachData.refreshWeather()}
            />
          )}
        </main>
        <footer className="site-footer">
          <div className="site-footer__row">
            <p>Conditions inform your plans; official guidance comes first.</p>
            <p className="site-footer__meta">
              Sandbridge Beach · Metric units · Eastern Time
            </p>
          </div>
          <p className="site-footer__sources">
            Weather and marine data by{" "}
            <a href="https://open-meteo.com/" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            (CC BY 4.0) · Tide predictions by{" "}
            <a href="https://tidesandcurrents.noaa.gov/" rel="noreferrer">
              NOAA CO-OPS
            </a>
            . Values are modeled or predicted estimates, not on-site
            observations.
          </p>
        </footer>
      </div>
    </>
  );
}
