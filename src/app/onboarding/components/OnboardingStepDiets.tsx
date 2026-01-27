"use client";

import * as React from "react";
import { CheckboxGroupField } from "./CheckboxGroupField";
import type { NoneOptionConfig } from "../types";

interface OnboardingStepDietsProps {
  /** Available diets from system config */
  options: string[];
  /** Currently selected diets */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Whether "No diet" is selected */
  hasNoDiets: boolean;
  /** Callback when "No diet" option changes */
  onNoDietsChange: (checked: boolean) => void;
  /** Validation error message */
  error?: string;
}

const NONE_OPTION: NoneOptionConfig = {
  label: "Brak diety",
  value: "none",
};

/**
 * Step 2 - Diets multi-select.
 * Displays list of supported diets with a "Brak diety" exclusive option.
 */
export function OnboardingStepDiets({
  options,
  value,
  onChange,
  hasNoDiets,
  onNoDietsChange,
  error,
}: OnboardingStepDietsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Wybierz diety</h2>
        <p className="text-muted-foreground mt-1">
          Zaznacz diety, których przestrzegasz. Pomoże nam to proponować odpowiednie zamienniki składników.
        </p>
      </div>

      <CheckboxGroupField
        label="Diety"
        options={options}
        value={value}
        onChange={onChange}
        noneOption={NONE_OPTION}
        noneSelected={hasNoDiets}
        onNoneChange={onNoDietsChange}
        error={error}
      />
    </div>
  );
}
