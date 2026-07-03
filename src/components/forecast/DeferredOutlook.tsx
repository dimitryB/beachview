interface DeferredOutlookProps {
  activity: "fishing" | "swimming";
}

const ACTIVITY_LABEL = {
  fishing: "Fishing",
  swimming: "Swimming",
} as const;

export function DeferredOutlook({ activity }: DeferredOutlookProps) {
  const label = ACTIVITY_LABEL[activity];
  const headingId = `deferred-${activity}-outlook-heading`;

  return (
    <section
      aria-busy="true"
      aria-labelledby={headingId}
      className="panel forecast-panel deferred-outlook"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">10-day outlook</p>
          <h2 id={headingId}>Preparing the {activity} outlook</h2>
        </div>
      </div>
      <p className="sr-only" role="status">
        Loading the extended {label.toLowerCase()} forecast presentation.
      </p>
      <div aria-hidden="true" className="deferred-outlook__skeleton">
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </section>
  );
}
