"use client";

/**
 * AIUsageIndicator Component
 *
 * Displays remaining AI substitution quota for the day.
 * Shows warning state when approaching limit.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type RecipesAIUsageState, RECIPES_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface AIUsageIndicatorProps {
  /** AI usage statistics */
  usage: RecipesAIUsageState;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Warning threshold - show warning when remaining is below this */
const WARNING_THRESHOLD = 2;

// =============================================================================
// Component
// =============================================================================

export function AIUsageIndicator({ usage, className }: AIUsageIndicatorProps) {
  const { substitutionsUsed, substitutionsLimit, substitutionsRemaining, isLoading, error } = usage;

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  // Don't render if there was an error loading usage
  if (error) {
    return null;
  }

  const isWarning = substitutionsRemaining > 0 && substitutionsRemaining <= WARNING_THRESHOLD;
  const isExceeded = substitutionsRemaining === 0;

  return (
    <div className={cn("flex items-center gap-2", className)} role="status" aria-live="polite">
      <span
        className={cn(
          "text-sm",
          isExceeded && "text-destructive font-medium",
          isWarning && "text-yellow-600 dark:text-yellow-500"
        )}
      >
        {RECIPES_STRINGS.aiUsage.remaining(substitutionsUsed, substitutionsLimit)}
      </span>

      {isWarning && !isExceeded && (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-500">
          {RECIPES_STRINGS.aiUsage.warning}
        </Badge>
      )}

      {isExceeded && <Badge variant="destructive">{RECIPES_STRINGS.aiUsage.exceeded}</Badge>}
    </div>
  );
}
