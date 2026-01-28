"use client";

/**
 * StapleToggle Component
 *
 * Single staple item with checkbox toggle.
 * Implements optimistic updates for immediate UI feedback.
 */

import { memo, useCallback, useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { InventoryItemDTO } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface StapleToggleProps {
  /** The staple inventory item */
  item: InventoryItemDTO;
  /** Callback when availability changes */
  onChange: (isAvailable: boolean) => void;
  /** Whether the item is currently being updated */
  isUpdating?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the display name for a staple item.
 */
function getStapleDisplayName(item: InventoryItemDTO): string {
  if (item.product?.name_pl) {
    return item.product.name_pl;
  }
  return item.custom_name ?? "Nieznany produkt";
}

// =============================================================================
// Component
// =============================================================================

function StapleToggleComponent({ item, onChange, isUpdating = false }: StapleToggleProps) {
  const checkboxId = useId();
  const displayName = getStapleDisplayName(item);

  const handleCheckedChange = useCallback(
    (checked: boolean | "indeterminate") => {
      if (typeof checked === "boolean") {
        onChange(checked);
      }
    },
    [onChange]
  );

  return (
    <div
      className={`hover:bg-muted/50 flex items-center gap-3 rounded-md px-1 py-2 transition-colors ${
        isUpdating ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        id={checkboxId}
        checked={item.is_available}
        onCheckedChange={handleCheckedChange}
        disabled={isUpdating}
        aria-describedby={`${checkboxId}-desc`}
        className="h-5 w-5"
      />

      <Label
        htmlFor={checkboxId}
        className={`flex-1 cursor-pointer text-sm select-none ${
          item.is_available ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {displayName}
      </Label>

      {/* Visually hidden description for screen readers */}
      <span id={`${checkboxId}-desc`} className="sr-only">
        {item.is_available ? "Dostępny" : "Niedostępny"}
      </span>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const StapleToggle = memo(StapleToggleComponent);
