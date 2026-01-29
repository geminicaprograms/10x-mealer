"use client";

/**
 * AIUsageSection Component
 *
 * Displays the user's AI feature usage statistics for the current day,
 * including receipt scans and substitution requests with progress indicators.
 */

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import type { AIUsageSectionProps } from "../types";
import { SETTINGS_STRINGS } from "../types";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formats the date for display (DD.MM.YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// =============================================================================
// Sub-components
// =============================================================================

interface UsageIndicatorProps {
  label: string;
  used: number;
  limit: number;
  remaining: number;
}

function UsageIndicator({ label, used, limit, remaining }: UsageIndicatorProps) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isExceeded = remaining === 0;
  const isWarning = remaining > 0 && remaining <= 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            isExceeded
              ? "text-destructive font-medium"
              : isWarning
                ? "font-medium text-yellow-600 dark:text-yellow-500"
                : ""
          }
        >
          {remaining}/{limit} {SETTINGS_STRINGS.aiUsage.remaining}
        </span>
      </div>
      <Progress
        value={percentage}
        className={isExceeded ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}
        aria-label={`${label}: ${remaining} z ${limit} ${SETTINGS_STRINGS.aiUsage.remaining}`}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AIUsageSection({ usage, isLoading, error, onRetry }: AIUsageSectionProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg leading-none font-semibold">{SETTINGS_STRINGS.aiUsage.title}</h2>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{SETTINGS_STRINGS.aiUsage.loadError}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                {SETTINGS_STRINGS.aiUsage.retry}
              </Button>
            )}
          </div>
        ) : usage ? (
          <div className="space-y-4">
            {/* Date display */}
            <p className="text-muted-foreground text-sm">
              {SETTINGS_STRINGS.aiUsage.date} ({formatDate(usage.date)})
            </p>

            {/* Usage indicators */}
            <div className="space-y-4">
              <UsageIndicator
                label={SETTINGS_STRINGS.aiUsage.scans}
                used={usage.receipt_scans.used}
                limit={usage.receipt_scans.limit}
                remaining={usage.receipt_scans.remaining}
              />
              <UsageIndicator
                label={SETTINGS_STRINGS.aiUsage.substitutions}
                used={usage.substitutions.used}
                limit={usage.substitutions.limit}
                remaining={usage.substitutions.remaining}
              />
            </div>

            {/* Reset info */}
            <p className="text-muted-foreground text-xs">{SETTINGS_STRINGS.aiUsage.resetInfo}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
