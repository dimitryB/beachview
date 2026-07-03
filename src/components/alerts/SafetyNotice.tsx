export function SafetyNotice() {
  return (
    <aside className="safety-notice" aria-labelledby="safety-notice-title">
      <div className="safety-notice__content">
        <span className="safety-notice__icon" aria-hidden="true">
          !
        </span>
        <div>
          <p className="eyebrow">Official guidance comes first</p>
          <h2 id="safety-notice-title">
            Conditions are not a safety determination.
          </h2>
          <p className="safety-notice__summary">
            Check beach flags, lifeguard instructions, the official surf
            forecast, and swimming advisories before entering the water.
          </p>
        </div>
      </div>
      <nav aria-label="Official beach safety sources">
        <a
          href="https://forecast.weather.gov/product.php?issuedby=AKQ&product=SRF&site=NWS"
          rel="noreferrer"
        >
          NWS Wakefield surf forecast
        </a>
        <a
          href="https://www.vdh.virginia.gov/waterborne-hazards-control/swimming-advisories-and-monitored-beaches-map/"
          rel="noreferrer"
        >
          VDH swimming advisories
        </a>
      </nav>
    </aside>
  );
}
