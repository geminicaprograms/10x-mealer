"use client";

/**
 * AddMissingItemButton Component
 *
 * Button to add an item that was missed by AI scan.
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface AddMissingItemButtonProps {
  /** Callback when button is clicked */
  onAdd: () => void;
  /** Whether the button is disabled */
  disabled: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function AddMissingItemButton({ onAdd, disabled }: AddMissingItemButtonProps) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onAdd} disabled={disabled}>
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      {SCAN_STRINGS.verification.addMissing}
    </Button>
  );
}
