"use client";

/**
 * RecipeDetailPage Component
 *
 * Displays a parsed recipe with AI-powered ingredient analysis.
 * Shows ingredient availability status, substitution suggestions,
 * allergy warnings, and provides "Cooked This" deduction functionality.
 */

import { use } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRecipeDetail } from "./hooks";
import { RecipeHeader, SubstitutionAnalysisSection, CookedThisButton, CookedThisDialog } from "./components";
import { RECIPE_DETAIL_STRINGS } from "./types";

// =============================================================================
// Types
// =============================================================================

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// Component
// =============================================================================

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params);

  // Main orchestrating hook
  const {
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
    cookedThisDialog,

    // Actions
    retryAnalysis,
    toggleSubstitution,
    openCookedThisDialog,
    closeCookedThisDialog,
    confirmDeductions,
    navigateToInventory,
    navigateBack,
  } = useRecipeDetail(id);

  // Show loading state (will show loading.tsx)
  if (isLoadingRecipe) {
    return null;
  }

  // Show error state
  if (recipeError || !recipe) {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <header className="bg-background sticky top-0 z-10 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateBack}
              aria-label={RECIPE_DETAIL_STRINGS.page.backLabel}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{RECIPE_DETAIL_STRINGS.page.title}</h1>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">{recipeError}</p>
        </main>
      </div>
    );
  }

  // Determine if cooked button should be disabled
  const isCookedButtonDisabled =
    !analysis ||
    isAnalyzing ||
    !analysis.ingredients.some(
      (ing) => (ing.status === "available" || ing.status === "partial") && ing.matchedItem && !ing.isStaple
    );

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="focus:bg-background sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:px-4 focus:py-2"
      >
        Przejdź do głównej treści
      </a>

      {/* Header with back navigation */}
      <header className="bg-background sticky top-0 z-10 border-b px-4 py-3" role="banner">
        <nav className="flex items-center gap-3" aria-label="Nawigacja strony">
          <Button variant="ghost" size="icon" onClick={navigateBack} aria-label={RECIPE_DETAIL_STRINGS.page.backLabel}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-lg font-semibold">{RECIPE_DETAIL_STRINGS.page.title}</h1>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 px-4 py-6 pb-24" role="main">
        {/* Recipe Header with title and source */}
        <RecipeHeader title={recipe.title} sourceUrl={recipe.source_url} sourceDomain={recipe.source_domain} />

        {/* Substitution Analysis Section */}
        <div className="mt-6">
          <SubstitutionAnalysisSection
            analysis={analysis}
            warnings={analysis?.warnings ?? []}
            aiUsage={aiUsage}
            isLoading={isAnalyzing}
            error={analysisError}
            isEmptyInventory={isEmptyInventory}
            canUseAI={canUseAI}
            isRateLimited={isRateLimited}
            onRetry={retryAnalysis}
            onAddProducts={navigateToInventory}
            onToggleSubstitution={toggleSubstitution}
            expandedIndices={expandedSubstitutions}
          />
        </div>
      </main>

      {/* Sticky Footer with Cooked This button */}
      <CookedThisButton onClick={openCookedThisDialog} disabled={isCookedButtonDisabled} />

      {/* Cooked This Confirmation Dialog */}
      <CookedThisDialog
        open={cookedThisDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeCookedThisDialog();
        }}
        ingredients={cookedThisDialog.deductionItems}
        onConfirm={confirmDeductions}
        isSubmitting={cookedThisDialog.isSubmitting}
      />

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isAnalyzing && "Analizowanie składników..."}
      </div>
    </div>
  );
}
