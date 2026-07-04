import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  SWIM_RULE_LIMITS,
  validateRecommendationConfig,
} from "@/config/recommendation-config";
import { SWIM_RULES, type SwimRules } from "@/config/rules";

interface ConfigPageProps {
  onReset: () => boolean;
  onSave: (rules: SwimRules) => boolean;
  rules: Readonly<SwimRules>;
}

interface ConfigField {
  key: keyof SwimRules;
  label: string;
  unit: string;
  step: number;
  help: string;
}

interface ConfigGroup {
  title: string;
  description: string;
  fields: readonly ConfigField[];
}

const GROUPS: readonly ConfigGroup[] = [
  {
    title: "Water and waves",
    description:
      "These boundaries drive the current marine flags and late-day matches.",
    fields: [
      {
        key: "waveHeightRedAboveM",
        label: "High-wave threshold",
        unit: "m",
        step: 0.1,
        help: "Wave heights above this value are flagged as high.",
      },
      {
        key: "wavePeriodRedBelowS",
        label: "Choppy-period threshold",
        unit: "s",
        step: 0.5,
        help: "Wave periods below this value are flagged as choppy.",
      },
      {
        key: "waterColdBelowC",
        label: "Cold-water threshold",
        unit: "°C",
        step: 0.5,
        help: "Water below this value receives a cold warning.",
      },
      {
        key: "waterWarmAboveC",
        label: "Warm-water threshold",
        unit: "°C",
        step: 0.5,
        help: "Water above this value receives a warm-water alert.",
      },
    ],
  },
  {
    title: "Wind",
    description:
      "Warning values affect swim matches; strong values also affect fishing candidate windows.",
    fields: [
      {
        key: "windWarningAtKmh",
        label: "Sustained-wind warning",
        unit: "km/h",
        step: 1,
        help: "Sustained wind at or above this value triggers discomfort.",
      },
      {
        key: "windGustWarningAtKmh",
        label: "Gust warning",
        unit: "km/h",
        step: 1,
        help: "Gusts at or above this value trigger discomfort.",
      },
      {
        key: "windStrongAtKmh",
        label: "Strong sustained wind",
        unit: "km/h",
        step: 1,
        help: "Sustained wind at or above this value is a red condition.",
      },
      {
        key: "windGustStrongAtKmh",
        label: "Strong gusts",
        unit: "km/h",
        step: 1,
        help: "Gusts at or above this value are a red condition.",
      },
    ],
  },
  {
    title: "Sun and time window",
    description:
      "These values define strong midday exposure and when late-day recommendations are evaluated.",
    fields: [
      {
        key: "uvWarningAt",
        label: "UV warning threshold",
        unit: "index",
        step: 0.5,
        help: "UV index at or above this value triggers an exposure warning.",
      },
      {
        key: "directRadiationWarningAtWm2",
        label: "Direct-radiation warning",
        unit: "W/m²",
        step: 25,
        help: "Direct radiation at or above this value warns during midday.",
      },
      {
        key: "middayStartHour",
        label: "Midday start",
        unit: "hour",
        step: 1,
        help: "Eastern hour in 24-hour time when the midday interval starts.",
      },
      {
        key: "middayEndHour",
        label: "Midday end",
        unit: "hour",
        step: 1,
        help: "Eastern hour in 24-hour time when the midday interval ends.",
      },
      {
        key: "lateDayStartHour",
        label: "Late-day start",
        unit: "hour",
        step: 1,
        help: "Eastern hour in 24-hour time when candidate windows can start.",
      },
      {
        key: "lateDayMinimumHours",
        label: "Minimum matching duration",
        unit: "hours",
        step: 1,
        help: "Shortest consecutive period that can be called a match.",
      },
    ],
  },
  {
    title: "Lower exposure",
    description:
      "Every hour in a matching late-day window needs at least one of these signals.",
    fields: [
      {
        key: "lowerExposureUvAtMost",
        label: "Maximum lower-exposure UV",
        unit: "index",
        step: 0.5,
        help: "UV at or below this value qualifies as lower exposure.",
      },
      {
        key: "lowerExposureRadiationAtMostWm2",
        label: "Maximum lower-exposure radiation",
        unit: "W/m²",
        step: 25,
        help: "Direct radiation at or below this value qualifies.",
      },
      {
        key: "lowerExposureCloudCoverAtLeastPct",
        label: "Minimum cloud cover",
        unit: "%",
        step: 1,
        help: "Cloud cover at or above this value qualifies as overcast.",
      },
    ],
  },
];

const ALL_FIELDS = GROUPS.flatMap((group) => group.fields);

function draftFromRules(
  rules: Readonly<SwimRules>,
): Record<keyof SwimRules, string> {
  return Object.fromEntries(
    ALL_FIELDS.map((field) => [field.key, String(rules[field.key])]),
  ) as Record<keyof SwimRules, string>;
}

function matchesDefaults(rules: Readonly<SwimRules>): boolean {
  return ALL_FIELDS.every(
    (field) => rules[field.key] === SWIM_RULES[field.key],
  );
}

export function ConfigPage({ onReset, onSave, rules }: ConfigPageProps) {
  const [draft, setDraft] = useState(() => draftFromRules(rules));
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const key = event.currentTarget.name as keyof SwimRules;
    const value = event.currentTarget.value;
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setErrors([]);
    setStatus(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRules = { ...SWIM_RULES } as SwimRules;

    for (const field of ALL_FIELDS) {
      nextRules[field.key] = Number(draft[field.key]);
    }

    const validationErrors = validateRecommendationConfig(nextRules);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setStatus(null);
      return;
    }

    if (!onSave(nextRules)) {
      setErrors([
        "Preferences could not be saved in this browser. Check browser storage settings and try again.",
      ]);
      setStatus(null);
      return;
    }

    setErrors([]);
    setStatus(
      "Preferences saved. Swimming and fishing recommendations now use these values.",
    );
  };

  const handleReset = () => {
    if (!onReset()) {
      setErrors([
        "Defaults could not be restored because browser storage is unavailable.",
      ]);
      setStatus(null);
      return;
    }

    setDraft(draftFromRules(SWIM_RULES));
    setErrors([]);
    setStatus("Default recommendation values restored.");
  };

  return (
    <div className="view-stack config-view">
      <section className="hero-panel" aria-labelledby="config-heading">
        <div>
          <p className="eyebrow">Config · Stored on this device</p>
          <h1 id="config-heading">Tune your comfort recommendations.</h1>
          <p className="hero-panel__summary">
            Adjust the thresholds behind comfort flags and candidate windows.
            Your choices stay in this browser and never change official guidance
            or provider data.
          </p>
        </div>
        <div className="readiness-card readiness-card--info">
          <span className="readiness-card__symbol" aria-hidden="true">
            i
          </span>
          <div>
            <strong>
              {matchesDefaults(rules) ? "Using defaults" : "Using your values"}
            </strong>
            <span>Preferences are local to this browser and device.</span>
          </div>
        </div>
      </section>

      <form className="config-form" onSubmit={handleSubmit}>
        <div className="config-form__intro">
          <div>
            <p className="eyebrow">Recommendation rules</p>
            <h2>Comfort thresholds</h2>
          </div>
          <p>
            Changes apply after you save. Equality behavior is described below
            each value.
          </p>
        </div>

        {errors.length > 0 ? (
          <div className="config-message config-message--error" role="alert">
            <strong>Review these values:</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {status ? (
          <p className="config-message config-message--success" role="status">
            {status}
          </p>
        ) : null}

        <div className="config-groups">
          {GROUPS.map((group) => (
            <fieldset className="config-group" key={group.title}>
              <legend>{group.title}</legend>
              <p className="config-group__description">{group.description}</p>
              <div className="config-fields">
                {group.fields.map((field) => {
                  const limits = SWIM_RULE_LIMITS[field.key];
                  const helpId = `${field.key}-help`;
                  return (
                    <div className="config-field" key={field.key}>
                      <label htmlFor={field.key}>{field.label}</label>
                      <div className="config-field__control">
                        <input
                          aria-describedby={helpId}
                          id={field.key}
                          inputMode="decimal"
                          max={limits.max}
                          min={limits.min}
                          name={field.key}
                          onChange={handleChange}
                          required
                          step={field.step}
                          type="number"
                          value={draft[field.key]}
                        />
                        <span>{field.unit}</span>
                      </div>
                      <p id={helpId}>{field.help}</p>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="config-actions">
          <button
            className="config-button config-button--primary"
            type="submit"
          >
            Save preferences
          </button>
          <button className="config-button" onClick={handleReset} type="button">
            Restore defaults
          </button>
        </div>
      </form>
    </div>
  );
}
