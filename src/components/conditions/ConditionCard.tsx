import type { ComfortTone } from "@/domain/comfort";
import type { ProviderStatus } from "@/types/domain";

export type ConditionTone = ComfortTone | "info";

export interface ConditionAssessment {
  explanation: string;
  label: string;
  tone: ConditionTone;
}

interface ConditionCardProps {
  assessment: ConditionAssessment;
  description: string;
  featured?: boolean;
  label: string;
  meta?: string;
  status: ProviderStatus;
  supportingText?: string;
  unit?: string;
  value: string | null;
  valueStyle?: "number" | "text";
}

const TONE_ICON: Record<ConditionTone, string> = {
  info: "i",
  neutral: "○",
  warning: "△",
  alert: "△",
  danger: "!",
  unavailable: "—",
};

export function ConditionCard({
  assessment,
  description,
  featured = false,
  label,
  meta,
  status,
  supportingText,
  unit,
  value,
  valueStyle = "number",
}: ConditionCardProps) {
  const isPending = status === "loading" && value === null;
  const isUnavailable = value === null && !isPending;
  const presentedAssessment: ConditionAssessment = isPending
    ? {
        tone: "info",
        label: "Loading",
        explanation: "Loading the latest provider data.",
      }
    : isUnavailable
      ? {
          tone: "unavailable",
          label: "Unavailable",
          explanation: description,
        }
      : assessment;

  return (
    <article
      className={[
        "condition-card",
        `condition-card--${status}`,
        `condition-card--tone-${presentedAssessment.tone}`,
        featured ? "condition-card--featured" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="condition-card__heading">
        <p className="condition-card__label">{label}</p>
        <span
          className={`condition-state condition-state--${presentedAssessment.tone}`}
        >
          <span aria-hidden="true">{TONE_ICON[presentedAssessment.tone]}</span>
          {presentedAssessment.label}
        </span>
      </div>
      <p
        className={`condition-card__value condition-card__value--${valueStyle}`}
      >
        {isPending ? (
          <>
            <span className="condition-card__skeleton" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </>
        ) : value === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">Unavailable</span>
          </>
        ) : (
          <span>{value}</span>
        )}
        {unit && value !== null ? (
          <span className="condition-card__unit">{unit}</span>
        ) : null}
      </p>
      <p className="condition-card__description">
        {isPending ? presentedAssessment.explanation : description}
      </p>
      {supportingText && value !== null ? (
        <p className="condition-card__supporting">{supportingText}</p>
      ) : null}
      {meta && value !== null ? (
        <p className="condition-card__meta">{meta}</p>
      ) : null}
    </article>
  );
}
