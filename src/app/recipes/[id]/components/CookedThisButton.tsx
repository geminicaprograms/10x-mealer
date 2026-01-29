"use client";

/**
 * CookedThisButton Component
 *
 * Sticky footer button that triggers the ingredient deduction flow.
 * Remains visible at bottom of screen for easy access.
 */

import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface CookedThisButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether button should be disabled */
  disabled: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CookedThisButton({ onClick, disabled }: CookedThisButtonProps) {
  return (
    <footer className="bg-background fixed right-0 bottom-0 left-0 z-10 border-t p-4">
      <Button
        className="w-full"
        size="lg"
        onClick={onClick}
        disabled={disabled}
        aria-label={RECIPE_DETAIL_STRINGS.cookedThis.button}
      >
        <ChefHat className="mr-2 h-5 w-5" aria-hidden="true" />
        {RECIPE_DETAIL_STRINGS.cookedThis.button}
      </Button>
    </footer>
  );
}
