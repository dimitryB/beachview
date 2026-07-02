export function SafetyNotice() {
  return (
    <aside className="safety-notice" aria-labelledby="safety-notice-title">
      <div>
        <p className="eyebrow">Official guidance</p>
        <h2 id="safety-notice-title">
          Check local advisories before entering the water.
        </h2>
      </div>
      <div className="safety-notice__links">
        <a
          href="https://forecast.weather.gov/product.php?issuedby=AKQ&product=SRF&site=NWS"
          rel="noreferrer"
        >
          NWS surf forecast
        </a>
        <a
          href="https://www.vdh.virginia.gov/waterborne-hazards-control/swimming-advisories-and-monitored-beaches-map/"
          rel="noreferrer"
        >
          VDH beach advisories
        </a>
      </div>
    </aside>
  );
}
