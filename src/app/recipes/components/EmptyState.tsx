"use client";

/**
 * EmptyState Component
 *
 * Friendly empty state displayed when no recent recipes exist.
 * Encourages user to import their first recipe.
 */

import { cn } from "@/lib/utils";
import { RECIPES_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface EmptyStateProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-4 py-12 text-center", className)}
      role="status"
      aria-live="polite"
    >
      {/* Illustration */}
      <div className="bg-muted mb-6 rounded-full p-6">
        <ChefHatIcon className="text-muted-foreground h-12 w-12" />
      </div>

      {/* Title */}
      <h2 className="text-foreground mb-2 text-xl font-semibold">{RECIPES_STRINGS.recentRecipes.empty.title}</h2>

      {/* Description */}
      <p className="text-muted-foreground max-w-sm">{RECIPES_STRINGS.recentRecipes.empty.description}</p>
    </div>
  );
}
