"use client";

import * as React from "react";
import { CheckboxGroupField } from "./CheckboxGroupField";
import type { NoneOptionConfig } from "../types";

interface OnboardingStepAllergiesProps {
  /** Available allergies from system config */
  options: string[];
  /** Currently selected allergies */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Whether "No allergies" is selected */
  hasNoAllergies: boolean;
  /** Callback when "No allergies" option changes */
  onNoAllergiesChange: (checked: boolean) => void;
  /** Validation error message */
  error?: string;
}

const NONE_OPTION: NoneOptionConfig = {
  label: "Brak alergii",
  value: "none",
};

/**
 * Step 1 - Allergies multi-select.
 * Displays list of supported allergies with a "Brak alergii" exclusive option.
 */
export function OnboardingStepAllergies({
  options,
  value,
  onChange,
  hasNoAllergies,
  onNoAllergiesChange,
  error,
}: OnboardingStepAllergiesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Wybierz alergie</h2>
        <p className="text-muted-foreground mt-1">
          Zaznacz alergie pokarmowe, które posiadasz. Dzięki temu będziemy mogli dostosować propozycje przepisów do
          Twoich potrzeb.
        </p>
      </div>

      <CheckboxGroupField
        label="Alergie pokarmowe"
        options={options}
        value={value}
        onChange={onChange}
        noneOption={NONE_OPTION}
        noneSelected={hasNoAllergies}
        onNoneChange={onNoAllergiesChange}
        error={error}
      />
    </div>
  );
}
