"use client";

/**
 * RateLimitDialog Component
 *
 * Modal dialog shown when user has reached daily scan limit.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface RateLimitDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Daily scan limit */
  limit: number;
}

// =============================================================================
// Component
// =============================================================================

export function RateLimitDialog({ isOpen, onClose, limit }: RateLimitDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{SCAN_STRINGS.rateLimit.title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{SCAN_STRINGS.rateLimit.message(limit)}</span>
            <span className="block">{SCAN_STRINGS.rateLimit.suggestion}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>{SCAN_STRINGS.rateLimit.close}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
