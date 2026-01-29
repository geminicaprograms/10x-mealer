"use client";

/**
 * useAIUsage Hook
 *
 * Fetches and manages AI usage statistics for the recipes page.
 * Specifically tracks substitution limits for recipe analysis.
 */

import { useState, useEffect, useCallback } from "react";
import { recipeApi, RecipeApiError } from "@/lib/services/recipe-api";
import { type RecipesAIUsageState, DEFAULT_AI_USAGE_STATE, RECIPES_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface UseAIUsageReturn {
  /** Current AI usage state */
  usage: RecipesAIUsageState;
  /** Refetch usage data from API */
  refetch: () => Promise<void>;
  /** Whether user can use substitutions (has remaining quota) */
  canUseSubstitutions: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAIUsage(): UseAIUsageReturn {
  const [usage, setUsage] = useState<RecipesAIUsageState>(DEFAULT_AI_USAGE_STATE);

  /**
   * Fetch usage data from API
   */
  const fetchUsage = useCallback(async () => {
    setUsage((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await recipeApi.getUsage();

      setUsage({
        substitutionsUsed: response.substitutions.used,
        substitutionsLimit: response.substitutions.limit,
        substitutionsRemaining: response.substitutions.remaining,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to fetch AI usage:", err);

      // Don't show error for 401 - user will be redirected
      if (err instanceof RecipeApiError && err.isUnauthorized()) {
        setUsage((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // For other errors, show generic error but keep any existing data
      setUsage((prev) => ({
        ...prev,
        isLoading: false,
        error: RECIPES_STRINGS.errors.serverError,
      }));
    }
  }, []);

  /**
   * Fetch on mount
   */
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  /**
   * Computed: can use substitutions
   */
  const canUseSubstitutions = usage.substitutionsRemaining > 0 && !usage.isLoading;

  return {
    usage,
    refetch: fetchUsage,
    canUseSubstitutions,
  };
}
