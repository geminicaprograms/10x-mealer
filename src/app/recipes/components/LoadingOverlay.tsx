"use client";

/**
 * LoadingOverlay Component
 *
 * Full-screen overlay displayed during AI parsing operations.
 * Blocks all interaction while showing processing status.
 */

import { Loader2 } from "lucide-react";
import { RECIPES_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface LoadingOverlayProps {
  /** Custom message to display */
  message?: string;
  /** Whether the overlay is visible */
  isVisible: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function LoadingOverlay({ message, isVisible }: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

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
            {message ?? RECIPES_STRINGS.loading.parsingUrl}
          </p>
          <p id="loading-description" className="text-muted-foreground mt-1 text-sm">
            To może potrwać kilka sekund
          </p>
        </div>
      </div>
    </div>
  );
}
