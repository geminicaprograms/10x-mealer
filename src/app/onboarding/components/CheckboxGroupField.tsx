"use client";

import * as React from "react";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { NoneOptionConfig } from "../types";

interface CheckboxGroupFieldProps {
  /** Group label for screen readers */
  label: string;
  /** Available options to select from */
  options: string[];
  /** Currently selected values */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Optional "None" option configuration for exclusive selection */
  noneOption?: NoneOptionConfig;
  /** Whether the "None" option is currently selected */
  noneSelected?: boolean;
  /** Callback when "None" option changes */
  onNoneChange?: (checked: boolean) => void;
  /** Error message to display */
  error?: string;
  /** Disable all checkboxes */
  disabled?: boolean;
  /** Additional class name for the fieldset */
  className?: string;
}

/**
 * Reusable checkbox group component with fieldset/legend for accessibility.
 * Supports an optional "None" exclusive option that clears and disables other selections.
 */
export function CheckboxGroupField({
  label,
  options,
  value,
  onChange,
  noneOption,
  noneSelected = false,
  onNoneChange,
  error,
  disabled = false,
  className,
}: CheckboxGroupFieldProps) {
  const groupId = useId();
  const errorId = useId();

  const handleItemChange = React.useCallback(
    (item: string, checked: boolean) => {
      // If selecting an item and "None" is selected, clear "None"
      if (checked && noneSelected && onNoneChange) {
        onNoneChange(false);
      }

      const newValue = checked ? [...value, item] : value.filter((v) => v !== item);

      onChange(newValue);
    },
    [value, onChange, noneSelected, onNoneChange]
  );

  const handleNoneChange = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        // Clear all selections when "None" is checked
        onChange([]);
      }
      onNoneChange?.(checked);
    },
    [onChange, onNoneChange]
  );

  return (
    <fieldset className={cn("space-y-4", className)} aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{label}</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Regular options */}
        {options.map((option) => {
          const itemId = `${groupId}-${option}`;
          const isChecked = value.includes(option);
          const isDisabled = disabled || noneSelected;

          return (
            <div key={option} className="flex items-center space-x-3">
              <Checkbox
                id={itemId}
                checked={isChecked}
                onCheckedChange={(checked) => handleItemChange(option, checked === true)}
                disabled={isDisabled}
                aria-describedby={error ? errorId : undefined}
              />
              <Label
                htmlFor={itemId}
                className={cn("cursor-pointer text-sm font-normal", isDisabled && "cursor-not-allowed opacity-50")}
              >
                {option}
              </Label>
            </div>
          );
        })}
      </div>

      {/* "None" option - displayed separately with visual distinction */}
      {noneOption && onNoneChange && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id={`${groupId}-none`}
              checked={noneSelected}
              onCheckedChange={(checked) => handleNoneChange(checked === true)}
              disabled={disabled}
              aria-describedby={error ? errorId : undefined}
            />
            <Label
              htmlFor={`${groupId}-none`}
              className={cn("cursor-pointer text-sm font-normal", disabled && "cursor-not-allowed opacity-50")}
            >
              {noneOption.label}
            </Label>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} className="text-destructive mt-2 text-sm" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  );
}
