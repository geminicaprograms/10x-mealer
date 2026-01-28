"use client";

/**
 * AIUsageIndicator Component
 *
 * Displays remaining AI scan quota for the day.
 * Shows warning when approaching limit.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SCAN_STRINGS, type AIUsageState } from "../types";

// =============================================================================
// Types
// =============================================================================

interface AIUsageIndicatorProps {
  /** AI usage statistics */
  usage: AIUsageState | null;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Warning threshold - show warning when remaining scans is below this */
const WARNING_THRESHOLD = 2;

// =============================================================================
// Component
// =============================================================================

export function AIUsageIndicator({ usage, className }: AIUsageIndicatorProps) {
  // Don't render if usage data not available
  if (!usage) {
    return null;
  }

  const { scansRemaining, scansLimit } = usage;
  const isWarning = scansRemaining > 0 && scansRemaining <= WARNING_THRESHOLD;
  const isExceeded = scansRemaining === 0;

  return (
    <div className={cn("flex items-center gap-2", className)} role="status" aria-live="polite">
      <span
        className={cn(
          "text-sm",
          isExceeded && "text-destructive font-medium",
          isWarning && "text-yellow-600 dark:text-yellow-500"
        )}
      >
        {SCAN_STRINGS.usage.remaining(scansRemaining, scansLimit)}
      </span>

      {isWarning && !isExceeded && (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-500">
          {SCAN_STRINGS.usage.warning}
        </Badge>
      )}

      {isExceeded && <Badge variant="destructive">{SCAN_STRINGS.usage.exceeded}</Badge>}
    </div>
  );
}
