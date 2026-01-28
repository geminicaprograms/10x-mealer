"use client";

/**
 * ActionButtons Component
 *
 * Footer action buttons for confirming or canceling the verification.
 */

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface ActionButtonsProps {
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Callback when confirm is clicked */
  onConfirm: () => void;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether there are valid items to submit */
  hasValidItems: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ActionButtons({ onCancel, onConfirm, isSubmitting, hasValidItems }: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
        {SCAN_STRINGS.actions.cancel}
      </Button>
      <Button
        type="button"
        className="flex-1"
        onClick={onConfirm}
        disabled={!hasValidItems || isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {SCAN_STRINGS.actions.submitting}
          </>
        ) : (
          SCAN_STRINGS.actions.confirm
        )}
      </Button>
    </div>
  );
}
