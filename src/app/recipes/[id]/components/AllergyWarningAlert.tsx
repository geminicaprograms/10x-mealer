"use client";

/**
 * AllergyWarningAlert Component
 *
 * Prominent alert component for displaying allergy and dietary warnings
 * detected by AI. Uses destructive styling to draw attention.
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { SubstitutionWarningDTO } from "@/types";
import { getWarningTitle } from "../types";

// =============================================================================
// Types
// =============================================================================

interface AllergyWarningAlertProps {
  /** Warning data from API */
  warning: SubstitutionWarningDTO;
}

// =============================================================================
// Component
// =============================================================================

export function AllergyWarningAlert({ warning }: AllergyWarningAlertProps) {
  const title = getWarningTitle(warning.type);

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{warning.message}</AlertDescription>
    </Alert>
  );
}
