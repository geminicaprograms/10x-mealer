"use client";

/**
 * ProcessButton Component
 *
 * Button to initiate AI receipt processing.
 * Disabled when no image selected or during processing.
 */

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface ProcessButtonProps {
  /** Callback when button is clicked */
  onProcess: () => void;
  /** Whether the button is disabled */
  disabled: boolean;
  /** Whether processing is in progress */
  isProcessing: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ProcessButton({ onProcess, disabled, isProcessing }: ProcessButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={onProcess}
      disabled={disabled || isProcessing}
      aria-busy={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {SCAN_STRINGS.process.processing}
        </>
      ) : (
        SCAN_STRINGS.process.button
      )}
    </Button>
  );
}
