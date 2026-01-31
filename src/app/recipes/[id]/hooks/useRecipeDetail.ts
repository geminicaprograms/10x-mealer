"use client";

/**
 * useRecipeDetail Hook
 *
 * Main orchestrating hook for the Recipe Detail page.
 * Combines recipe loading, substitution analysis, and deduction management.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useRecipeStorage } from "../../hooks";
import { useAIUsage } from "../../hooks";
import { useSubstitutionAnalysis } from "./useSubstitutionAnalysis";
import { useInventoryDeduction } from "./useInventoryDeduction";
import {
  type SubstitutionAnalysisViewModel,
  type CookedThisDialogState,
  createDeductionItems,
  RECIPE_DETAIL_STRINGS,
  DEFAULT_COOKED_THIS_DIALOG_STATE,
} from "../types";
import type { RecentRecipe } from "../../types";
import type { InventoryDeductionItemCommand } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface UseRecipeDetailReturn {
  // Recipe state
  recipe: RecentRecipe | null;
  isLoadingRecipe: boolean;
  recipeError: string | null;

  // Analysis state
  analysis: SubstitutionAnalysisViewModel | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // UI state
  isEmptyInventory: boolean;
  canUseAI: boolean;
  isRateLimited: boolean;
  expandedSubstitutions: Set<number>;

  // AI Usage
  aiUsage: ReturnType<typeof useAIUsage>["usage"];

  // Dialog state
  cookedThisDialog: CookedThisDialogState;

  // Actions
  retryAnalysis: () => Promise<void>;
  toggleSubstitution: (index: number) => void;
  openCookedThisDialog: () => void;
  closeCookedThisDialog: () => void;
  updateDeductionQuantity: (itemId: string, quantity: number) => void;
  confirmDeductions: (deductions: InventoryDeductionItemCommand[]) => Promise<void>;
  navigateToInventory: () => void;
  navigateBack: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useRecipeDetail(recipeId: string): UseRecipeDetailReturn {
  const router = useRouter();

  // External hooks
  const { getRecipe, updateLastAccessed } = useRecipeStorage();
  const { usage: aiUsage, refetch: refetchAIUsage, canUseSubstitutions } = useAIUsage();
  const {
    analyzeIngredients,
    analysis,
    isAnalyzing,
    error: analysisError,
    isRateLimited,
    reset: resetAnalysisError,
  } = useSubstitutionAnalysis();
  const { deductInventory, isDeducting } = useInventoryDeduction();

  // Recipe state
  const [recipe, setRecipe] = useState<RecentRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  // UI state
  const [expandedSubstitutions, setExpandedSubstitutions] = useState<Set<number>>(new Set());
  const [isEmptyInventory, setIsEmptyInventory] = useState(false);
  const [hasTriedAnalysis, setHasTriedAnalysis] = useState(false);

  // Dialog state
  const [cookedThisDialog, setCookedThisDialog] = useState<CookedThisDialogState>(DEFAULT_COOKED_THIS_DIALOG_STATE);

  // ==========================================================================
  // Load Recipe
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    const loadRecipe = async () => {
      if (!recipeId) {
        setRecipeError(RECIPE_DETAIL_STRINGS.errors.recipeNotFound);
        setIsLoadingRecipe(false);
        return;
      }

      try {
        setIsLoadingRecipe(true);
        setRecipeError(null);

        const loadedRecipe = await getRecipe(recipeId);

        if (!mounted) return;

        if (!loadedRecipe) {
          setRecipeError(RECIPE_DETAIL_STRINGS.errors.recipeNotFound);
          toast.error(RECIPE_DETAIL_STRINGS.errors.recipeNotFound);
          setTimeout(() => router.push("/recipes"), 1500);
          return;
        }

        setRecipe(loadedRecipe);

        // Update last accessed timestamp
        await updateLastAccessed(recipeId);
      } catch (err) {
        console.error("Failed to load recipe:", err);
        if (mounted) {
          setRecipeError(RECIPE_DETAIL_STRINGS.errors.recipeNotFound);
        }
      } finally {
        if (mounted) {
          setIsLoadingRecipe(false);
        }
      }
    };

    loadRecipe();

    return () => {
      mounted = false;
    };
  }, [recipeId, getRecipe, updateLastAccessed, router]);

  // ==========================================================================
  // Auto-trigger Analysis
  // ==========================================================================

  useEffect(() => {
    // Only auto-analyze once when conditions are met
    if (
      recipe &&
      !isLoadingRecipe &&
      !analysis &&
      !isAnalyzing &&
      !hasTriedAnalysis &&
      canUseSubstitutions &&
      !aiUsage.isLoading
    ) {
      setHasTriedAnalysis(true);
      analyzeIngredients(recipe.ingredients).then((result) => {
        // Check if we got an empty result (possibly empty inventory)
        if (result && result.ingredients.every((i) => i.status === "missing" && !i.substitution)) {
          setIsEmptyInventory(true);
        }
      });
    }
  }, [
    recipe,
    isLoadingRecipe,
    analysis,
    isAnalyzing,
    hasTriedAnalysis,
    canUseSubstitutions,
    aiUsage.isLoading,
    analyzeIngredients,
  ]);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const canUseAI = canUseSubstitutions && !isRateLimited;

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Retry substitution analysis
   */
  const retryAnalysis = useCallback(async () => {
    if (!recipe || isAnalyzing || isRateLimited) return;

    resetAnalysisError();
    setIsEmptyInventory(false);

    const result = await analyzeIngredients(recipe.ingredients);

    // Refetch AI usage after analysis
    await refetchAIUsage();

    // Check for empty inventory
    if (result && result.ingredients.every((i) => i.status === "missing" && !i.substitution)) {
      setIsEmptyInventory(true);
    }
  }, [recipe, isAnalyzing, isRateLimited, resetAnalysisError, analyzeIngredients, refetchAIUsage]);

  /**
   * Toggle substitution expansion
   */
  const toggleSubstitution = useCallback((index: number) => {
    setExpandedSubstitutions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  /**
   * Open Cooked This dialog
   */
  const openCookedThisDialog = useCallback(() => {
    if (!analysis) return;

    const deductionItems = createDeductionItems(analysis);

    setCookedThisDialog({
      isOpen: true,
      isSubmitting: false,
      deductionItems,
      error: null,
    });
  }, [analysis]);

  /**
   * Close Cooked This dialog
   */
  const closeCookedThisDialog = useCallback(() => {
    setCookedThisDialog(DEFAULT_COOKED_THIS_DIALOG_STATE);
  }, []);

  /**
   * Update deduction quantity
   */
  const updateDeductionQuantity = useCallback((itemId: string, quantity: number) => {
    setCookedThisDialog((prev) => ({
      ...prev,
      deductionItems: prev.deductionItems.map((item) =>
        item.inventoryItemId === itemId ? { ...item, adjustedQuantity: quantity } : item
      ),
    }));
  }, []);

  /**
   * Confirm and submit deductions
   */
  const confirmDeductions = useCallback(
    async (deductions: InventoryDeductionItemCommand[]) => {
      setCookedThisDialog((prev) => ({ ...prev, isSubmitting: true, error: null }));

      const result = await deductInventory(deductions);

      if (result) {
        // Success
        toast.success(RECIPE_DETAIL_STRINGS.cookedThis.successToast);
        closeCookedThisDialog();

        // Optionally refresh analysis to show updated inventory
        if (recipe) {
          await analyzeIngredients(recipe.ingredients);
        }
      } else {
        // Error handled in hook, but update dialog state
        setCookedThisDialog((prev) => ({
          ...prev,
          isSubmitting: false,
          error: RECIPE_DETAIL_STRINGS.cookedThis.errorToast,
        }));
      }
    },
    [deductInventory, closeCookedThisDialog, recipe, analyzeIngredients]
  );

  /**
   * Navigate to inventory
   */
  const navigateToInventory = useCallback(() => {
    router.push("/inventory");
  }, [router]);

  /**
   * Navigate back to recipes list
   */
  const navigateBack = useCallback(() => {
    router.push("/recipes");
  }, [router]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Recipe state
    recipe,
    isLoadingRecipe,
    recipeError,

    // Analysis state
    analysis,
    isAnalyzing,
    analysisError,

    // UI state
    isEmptyInventory,
    canUseAI,
    isRateLimited,
    expandedSubstitutions,

    // AI Usage
    aiUsage,

    // Dialog state
    cookedThisDialog: {
      ...cookedThisDialog,
      isSubmitting: isDeducting,
    },

    // Actions
    retryAnalysis,
    toggleSubstitution,
    openCookedThisDialog,
    closeCookedThisDialog,
    updateDeductionQuantity,
    confirmDeductions,
    navigateToInventory,
    navigateBack,
  };
}
