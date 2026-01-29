"use client";

/**
 * IngredientStatusBadge Component
 *
 * Color-coded badge indicating ingredient availability status.
 * Uses semantic colors matching the UI plan:
 * - Available (green): Ingredient is fully available in inventory
 * - Partial (yellow): Ingredient is partially available
 * - Missing with substitution (yellow): Missing but has AI suggestion
 * - Missing without substitution (red): Missing and no substitute found
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IngredientStatus } from "@/types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface IngredientStatusBadgeProps {
  /** Ingredient availability status */
  status: IngredientStatus;
  /** Whether a substitution suggestion is available */
  hasSubstitution: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Badge configuration based on status and substitution availability
 */
const BADGE_CONFIG = {
  available: {
    label: RECIPE_DETAIL_STRINGS.ingredients.statusLabels.available,
    variant: "default" as const,
    className: "bg-green-600 hover:bg-green-600 text-white",
  },
  partial: {
    label: RECIPE_DETAIL_STRINGS.ingredients.statusLabels.partial,
    variant: "secondary" as const,
    className: "bg-yellow-500 hover:bg-yellow-500 text-white",
  },
  missingWithSubstitution: {
    label: RECIPE_DETAIL_STRINGS.ingredients.statusLabels.substitution,
    variant: "secondary" as const,
    className: "bg-yellow-500 hover:bg-yellow-500 text-white",
  },
  missingWithoutSubstitution: {
    label: RECIPE_DETAIL_STRINGS.ingredients.statusLabels.missing,
    variant: "destructive" as const,
    className: "",
  },
} as const;

// =============================================================================
// Component
// =============================================================================

export function IngredientStatusBadge({ status, hasSubstitution, className }: IngredientStatusBadgeProps) {
  // Determine badge configuration based on status
  let config: (typeof BADGE_CONFIG)[keyof typeof BADGE_CONFIG];

  switch (status) {
    case "available":
      config = BADGE_CONFIG.available;
      break;
    case "partial":
      config = BADGE_CONFIG.partial;
      break;
    case "missing":
      config = hasSubstitution ? BADGE_CONFIG.missingWithSubstitution : BADGE_CONFIG.missingWithoutSubstitution;
      break;
    default:
      config = BADGE_CONFIG.missingWithoutSubstitution;
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      aria-label={`Status składnika: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
