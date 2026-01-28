"use client";

/**
 * ConfidenceIndicator Component
 *
 * Visual indicator of AI extraction confidence level.
 * Displays a colored dot (green/yellow/red) based on confidence score.
 */

import { cn } from "@/lib/utils";
import { getConfidenceLevel, SCAN_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface ConfidenceIndicatorProps {
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ConfidenceIndicator({ confidence, showTooltip = true, className }: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  const colorClasses = {
    high: "bg-green-500",
    medium: "bg-yellow-500",
    low: "bg-red-500",
  };

  const tooltipText = {
    high: SCAN_STRINGS.tooltips.confidenceHigh,
    medium: SCAN_STRINGS.tooltips.confidenceMedium,
    low: SCAN_STRINGS.tooltips.confidenceLow,
  };

  return (
    <div
      className={cn("relative inline-flex items-center", className)}
      title={showTooltip ? `${tooltipText[level]} (${percentage}%)` : undefined}
      aria-label={`${tooltipText[level]}: ${percentage}%`}
    >
      <span className={cn("h-3 w-3 shrink-0 rounded-full", colorClasses[level])} aria-hidden="true" />
    </div>
  );
}
