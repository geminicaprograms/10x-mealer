"use client";

import * as React from "react";
import { CheckboxGroupField } from "./CheckboxGroupField";

interface OnboardingStepEquipmentProps {
  /** Available equipment from system config */
  options: string[];
  /** Currently selected equipment */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Validation error message */
  error?: string;
}

/**
 * Step 3 - Equipment multi-select.
 * Displays list of kitchen equipment the user owns.
 * No "None" option - empty selection is allowed.
 */
export function OnboardingStepEquipment({ options, value, onChange, error }: OnboardingStepEquipmentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Wybierz sprzęt kuchenny</h2>
        <p className="text-muted-foreground mt-1">
          Zaznacz sprzęt kuchenny, który posiadasz. Dzięki temu będziemy wiedzieć, jakie przepisy możesz przygotować.
        </p>
      </div>

      <CheckboxGroupField label="Sprzęt kuchenny" options={options} value={value} onChange={onChange} error={error} />

      <p className="text-muted-foreground text-sm">
        Możesz pominąć ten krok, jeśli nie posiadasz żadnego specjalistycznego sprzętu kuchennego.
      </p>
    </div>
  );
}
