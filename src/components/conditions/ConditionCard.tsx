import type { ProviderStatus } from "@/types/domain";

interface ConditionCardProps {
  description: string;
  label: string;
  status: ProviderStatus;
  unit?: string;
  value: string | null;
}

export function ConditionCard({
  description,
  label,
  status,
  unit,
  value,
}: ConditionCardProps) {
  return (
    <article className={`condition-card condition-card--${status}`}>
      <p className="condition-card__label">{label}</p>
      <p className="condition-card__value">
        {value === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">
              {status === "error" ? "Unavailable" : "Awaiting data"}
            </span>
          </>
        ) : (
          <span>{value}</span>
        )}
        {unit && value !== null ? (
          <span className="condition-card__unit">{unit}</span>
        ) : null}
      </p>
      <p className="condition-card__description">{description}</p>
    </article>
  );
}
