"use client";

/**
 * IngredientItem Component
 *
 * Individual ingredient row displaying name, quantity, status badge,
 * and expandable substitution suggestion.
 */

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { IngredientStatusBadge } from "./IngredientStatusBadge";
import { type IngredientAnalysisViewModel, formatIngredientQuantity, RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface IngredientItemProps {
  /** Ingredient analysis data */
  ingredient: IngredientAnalysisViewModel;
  /** Whether substitution section is expanded */
  isExpanded: boolean;
  /** Toggle expanded state */
  onToggle: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function IngredientItem({ ingredient, isExpanded, onToggle }: IngredientItemProps) {
  const { name, quantity, unit, status, substitution, allergyWarning } = ingredient;
  const hasSubstitution = substitution !== null && substitution.available;

  return (
    <li className="border-border/50 border-b last:border-0">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="flex items-center gap-3 py-3">
          {/* Status Badge */}
          <IngredientStatusBadge status={status} hasSubstitution={hasSubstitution} />

          {/* Ingredient Info */}
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">{name}</p>
            <p className="text-muted-foreground text-xs">{formatIngredientQuantity(quantity, unit)}</p>
          </div>

          {/* Collapsible Trigger (only if there's a substitution) */}
          {hasSubstitution && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                aria-label={
                  isExpanded
                    ? RECIPE_DETAIL_STRINGS.ingredients.hideSubstitution
                    : RECIPE_DETAIL_STRINGS.ingredients.showSubstitution
                }
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {/* Collapsible Content - Substitution Suggestion */}
        {hasSubstitution && substitution && (
          <CollapsibleContent>
            <div
              className={cn(
                "pb-3 pl-[calc(theme(spacing.20)+theme(spacing.3))]", // Align with ingredient name
                "text-muted-foreground text-sm",
                "ml-2.5 border-l-2 border-yellow-500/50"
              )}
            >
              {/* Substitute item name */}
              {substitution.substitute_item && (
                <p className="text-foreground mb-1 font-medium">
                  → {substitution.substitute_item.name}
                  {substitution.substitute_item.quantity && (
                    <span className="text-muted-foreground ml-1 font-normal">
                      ({substitution.substitute_item.quantity} {substitution.substitute_item.unit || ""})
                    </span>
                  )}
                </p>
              )}

              {/* AI suggestion text */}
              <p className="text-muted-foreground leading-relaxed">{substitution.suggestion}</p>
            </div>
          </CollapsibleContent>
        )}

        {/* Per-ingredient allergy warning */}
        {allergyWarning && (
          <div className="px-3 pb-3">
            <p className="text-destructive bg-destructive/10 rounded px-2 py-1 text-xs">⚠️ {allergyWarning}</p>
          </div>
        )}
      </Collapsible>
    </li>
  );
}
