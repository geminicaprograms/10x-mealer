"use client";

/**
 * FloatingActionButton Component
 *
 * Fixed-position action button(s) for quick access to scan and add functionality.
 * Positioned in bottom-right corner above the navigation.
 */

import { Button } from "@/components/ui/button";

import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface FloatingActionButtonProps {
  /** Callback when scan button is clicked */
  onScanClick: () => void;
  /** Callback when quick add button is clicked */
  onQuickAddClick: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function FloatingActionButton({ onScanClick, onQuickAddClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-3" role="group" aria-label="Akcje szybkiego dostępu">
      {/* Quick Add Button (Secondary) */}
      <Button
        variant="outline"
        size="icon"
        onClick={onQuickAddClick}
        aria-label={INVENTORY_STRINGS.actions.quickAdd}
        className="bg-background hover:bg-muted h-12 w-12 rounded-full shadow-lg"
      >
        <PlusIcon className="h-5 w-5" />
      </Button>

      {/* Scan Button (Primary) */}
      <Button
        size="icon"
        onClick={onScanClick}
        aria-label={INVENTORY_STRINGS.actions.scanReceipt}
        className="h-14 w-14 rounded-full shadow-lg"
      >
        <CameraIcon className="h-6 w-6" />
      </Button>
    </div>
  );
}
