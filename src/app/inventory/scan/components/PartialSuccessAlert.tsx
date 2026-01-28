"use client";

/**
 * PartialSuccessAlert Component
 *
 * Alert banner shown when batch inventory creation has partial success (207 response).
 */

import { useState, useCallback } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SCAN_STRINGS, type PartialSuccessResult } from "../types";

// =============================================================================
// Types
// =============================================================================

interface PartialSuccessAlertProps {
  /** Partial success result data */
  result: PartialSuccessResult;
  /** Callback when alert is dismissed */
  onDismiss: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PartialSuccessAlert({ result, onDismiss }: PartialSuccessAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const { total, created, failed, errors } = result;

  return (
    <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="flex items-center justify-between">
        <span>{SCAN_STRINGS.partialSuccess.title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
          aria-label={SCAN_STRINGS.partialSuccess.dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{SCAN_STRINGS.success.partialSuccess(created, total)}</p>

        {errors.length > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 py-1"
              onClick={toggleExpanded}
              aria-expanded={isExpanded}
              aria-controls="error-details"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  {SCAN_STRINGS.partialSuccess.hideErrors}
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  {SCAN_STRINGS.partialSuccess.viewErrors} ({failed})
                </>
              )}
            </Button>

            <div
              id="error-details"
              className={cn("mt-2 overflow-hidden transition-all", isExpanded ? "max-h-40" : "max-h-0")}
            >
              <ul className="space-y-1 text-sm">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    • Pozycja {err.index + 1}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
