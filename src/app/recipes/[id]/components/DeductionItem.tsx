"use client";

/**
 * DeductionItem Component
 *
 * Single row in the deduction confirmation dialog showing ingredient name,
 * current inventory amount, and editable deduction quantity.
 */

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DeductionItemViewModel } from "../types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface DeductionItemProps {
  /** Deduction item data */
  item: DeductionItemViewModel;
  /** Callback when quantity changes */
  onChange: (quantity: number) => void;
}

// =============================================================================
// Component
// =============================================================================

export function DeductionItem({ item, onChange }: DeductionItemProps) {
  const { name, currentInventoryQuantity, unit, adjustedQuantity } = item;

  // Check if quantity exceeds inventory
  const exceedsInventory = adjustedQuantity > currentInventoryQuantity;

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Allow empty input (will be treated as 0)
      if (value === "") {
        onChange(0);
        return;
      }

      // Parse as float to support decimal values
      const numValue = parseFloat(value);

      // Ignore invalid values
      if (isNaN(numValue)) {
        return;
      }

      // Ensure non-negative
      onChange(Math.max(0, numValue));
    },
    [onChange]
  );

  /**
   * Handle blur - ensure valid number
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);

      if (isNaN(value) || value < 0) {
        onChange(0);
      }
    },
    [onChange]
  );

  return (
    <div className="border-border/50 flex items-center gap-3 border-b py-3 last:border-0">
      {/* Ingredient name and current inventory */}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">
          {RECIPE_DETAIL_STRINGS.cookedThis.currentInventory}{" "}
          <span className="font-medium">
            {currentInventoryQuantity} {unit}
          </span>
        </p>
      </div>

      {/* Quantity input */}
      <div className="flex shrink-0 items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={adjustedQuantity}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn("w-20 text-right", exceedsInventory && "border-yellow-500 focus-visible:ring-yellow-500/50")}
          aria-label={`Ilość do odliczenia dla ${name}`}
          aria-invalid={exceedsInventory}
        />
        <span className="text-muted-foreground w-12 truncate text-sm">{unit}</span>
      </div>

      {/* Warning indicator */}
      {exceedsInventory && (
        <p className="sr-only" role="alert">
          {RECIPE_DETAIL_STRINGS.cookedThis.warningExceedsInventory}
        </p>
      )}
    </div>
  );
}
