import { useEffect, useRef, useState } from "react";

import { SafetyNotice } from "@/components/alerts/SafetyNotice";
import { DataUpdateAnnouncer } from "@/components/conditions/DataUpdateAnnouncer";
import { OfflineNotice } from "@/components/conditions/OfflineNotice";
import { AppHeader } from "@/components/layout/AppHeader";
import { PrimaryNavigation } from "@/components/layout/PrimaryNavigation";
import { SourceDetails } from "@/components/layout/SourceDetails";
import {
  clearRecommendationConfig,
  defaultRecommendationConfig,
  loadRecommendationConfig,
  saveRecommendationConfig,
} from "@/config/recommendation-config";
import type { SwimRules } from "@/config/rules";
import { readView, viewHref, type AppView } from "@/app/routes";
import { useBeachData } from "@/hooks/use-beach-data";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { ConfigPage } from "@/pages/ConfigPage";
import { FishingPage } from "@/pages/FishingPage";
import { SwimmingPage } from "@/pages/SwimmingPage";

const VIEW_TITLES: Record<AppView, string> = {
  swimming: "Swimming · VABeachCast · Sandbridge Beach",
  fishing: "Fishing · VABeachCast · Sandbridge Beach",
  config: "Config · VABeachCast · Sandbridge Beach",
};

export function App() {
  const [view, setView] = useState<AppView>(() =>
    readView(window.location.search),
  );
  const [recommendationRules, setRecommendationRules] = useState(() =>
    loadRecommendationConfig(),
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

  const saveRules = (rules: SwimRules): boolean => {
    if (!saveRecommendationConfig(rules)) {
      return false;
    }
    setRecommendationRules(rules);
    return true;
  };

  const resetRules = (): boolean => {
    if (!clearRecommendationConfig()) {
      return false;
    }
    setRecommendationRules(defaultRecommendationConfig());
    return true;
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="app-shell">
        <DataUpdateAnnouncer data={beachData} />
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
              rules={recommendationRules}
            />
          ) : view === "fishing" ? (
            <FishingPage
              data={beachData}
              onRetryTides={() => void beachData.refreshTides()}
              onRetryWeather={() => void beachData.refreshWeather()}
              rules={recommendationRules}
            />
          ) : (
            <ConfigPage
              onReset={resetRules}
              onSave={saveRules}
              rules={recommendationRules}
            />
          )}
        </main>
        {view === "config" ? null : <SourceDetails data={beachData} />}
        <footer className="site-footer">
          <div className="site-footer__row">
            <p>VABeachCast · Sandbridge Beach, Virginia Beach</p>
            <p className="site-footer__meta">
              Sandbridge Beach · Metric units · Eastern Time
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
