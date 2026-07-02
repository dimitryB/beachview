interface ConditionPlaceholderProps {
  description: string;
  label: string;
  unit?: string;
}

export function ConditionPlaceholder({
  description,
  label,
  unit,
}: ConditionPlaceholderProps) {
  return (
    <article className="condition-card">
      <p className="condition-card__label">{label}</p>
      <p className="condition-card__value">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Awaiting data</span>
        {unit ? <span className="condition-card__unit">{unit}</span> : null}
      </p>
      <p className="condition-card__description">{description}</p>
    </article>
  );
}
