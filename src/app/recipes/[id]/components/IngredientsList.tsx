"use client";

/**
 * IngredientsList Component
 *
 * Container component that renders the list of ingredients with their
 * analysis status. Manages expanded state for substitution collapsibles.
 */

import { useCallback } from "react";
import { IngredientItem } from "./IngredientItem";
import type { IngredientAnalysisViewModel } from "../types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface IngredientsListProps {
  /** List of analyzed ingredients */
  ingredients: IngredientAnalysisViewModel[];
  /** Callback when substitution is toggled */
  onToggleSubstitution: (ingredientIndex: number) => void;
  /** Set of currently expanded ingredient indices */
  expandedIndices: Set<number>;
}

// =============================================================================
// Component
// =============================================================================

export function IngredientsList({ ingredients, onToggleSubstitution, expandedIndices }: IngredientsListProps) {
  /**
   * Create toggle handler for specific index
   */
  const createToggleHandler = useCallback(
    (index: number) => () => {
      onToggleSubstitution(index);
    },
    [onToggleSubstitution]
  );

  if (ingredients.length === 0) {
    return <p className="text-muted-foreground py-4 text-sm">Brak składników do wyświetlenia</p>;
  }

  return (
    <ul role="list" aria-label={RECIPE_DETAIL_STRINGS.ingredients.listTitle} className="divide-y-0">
      {ingredients.map((ingredient, index) => (
        <IngredientItem
          key={`${ingredient.name}-${index}`}
          ingredient={ingredient}
          isExpanded={expandedIndices.has(index)}
          onToggle={createToggleHandler(index)}
        />
      ))}
    </ul>
  );
}
