"use client";

/**
 * LoadingOverlay Component
 *
 * Full-screen overlay displayed during AI processing.
 * Blocks all interaction while showing processing status.
 */

import { Loader2 } from "lucide-react";
import { SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface LoadingOverlayProps {
  /** Custom message to display (defaults to standard processing message) */
  message?: string;
}

// =============================================================================
// Component
// =============================================================================

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <Loader2 className="text-primary h-12 w-12 animate-spin" aria-hidden="true" />
        <div className="text-center">
          <p id="loading-title" className="text-lg font-medium">
            {message ?? SCAN_STRINGS.loading.message}
          </p>
          <p id="loading-description" className="text-muted-foreground mt-1 text-sm">
            {SCAN_STRINGS.loading.hint}
          </p>
        </div>
      </div>
    </div>
  );
}
