"use client";

/**
 * EmptyInventoryMessage Component
 *
 * Informational message displayed when the user has no items in their inventory.
 * Guides users to add products before using recipe tailoring (US-017).
 */

import { Package } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface EmptyInventoryMessageProps {
  /** Callback when user clicks to add products */
  onAddProducts: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function EmptyInventoryMessage({ onAddProducts }: EmptyInventoryMessageProps) {
  return (
    <Alert variant="default" className="bg-muted/50">
      <Package className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{RECIPE_DETAIL_STRINGS.emptyInventory.title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{RECIPE_DETAIL_STRINGS.emptyInventory.description}</p>
        <Button variant="outline" size="sm" onClick={onAddProducts}>
          {RECIPE_DETAIL_STRINGS.emptyInventory.actionButton}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
