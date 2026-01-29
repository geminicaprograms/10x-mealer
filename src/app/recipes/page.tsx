"use client";

/**
 * RecipesPage Component
 *
 * Main page component for the /recipes route.
 * Orchestrates recipe importing via URL or text parsing,
 * displays AI usage limits, and shows recent recipes from IndexedDB.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BottomNavigation } from "@/components/BottomNavigation";
import { useRecipeStorage, useRecipeParse, useAIUsage } from "./hooks";
import { AIUsageIndicator, LoadingOverlay, RecipeInputSection, RecentRecipesList } from "./components";
import { RECIPES_STRINGS } from "./types";

// =============================================================================
// Component
// =============================================================================

export default function RecipesPage() {
  const router = useRouter();

  // Initialize hooks
  const { recipes, isLoading: isLoadingRecipes, saveRecipe, deleteRecipe, updateLastAccessed } = useRecipeStorage();
  const { parseUrl, parseText, isLoading: isParsingUrl, error: urlError, reset: resetUrlError } = useRecipeParse();
  const { usage } = useAIUsage();

  // Track which input method is being used for separate loading states
  const [isParsingText, setIsParsingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  /**
   * Handle URL parsing
   */
  const handleParseUrl = useCallback(
    async (url: string) => {
      resetUrlError();

      const result = await parseUrl(url);

      if (!result) {
        // Error is already set in the hook
        return;
      }

      try {
        // Save to IndexedDB
        const recipeId = await saveRecipe({
          title: result.title,
          source_url: result.source_url,
          ingredients: result.ingredients,
          parsing_confidence: result.parsing_confidence,
        });

        // Navigate to recipe detail page
        router.push(`/recipes/${recipeId}`);
      } catch (err) {
        console.error("Failed to save recipe:", err);
        toast.error(RECIPES_STRINGS.errors.storageError);
      }
    },
    [parseUrl, saveRecipe, router, resetUrlError]
  );

  /**
   * Handle text parsing
   */
  const handleParseText = useCallback(
    async (text: string) => {
      setTextError(null);
      setIsParsingText(true);

      try {
        const result = await parseText(text);

        if (!result) {
          // Error is already set in the hook - get it and set locally
          setIsParsingText(false);
          return;
        }

        // For text parsing, we don't have a title or URL, so generate them
        const generatedTitle = `Przepis z ${new Date().toLocaleDateString("pl-PL")}`;
        const generatedUrl = `text://${Date.now()}`;

        try {
          // Save to IndexedDB
          const recipeId = await saveRecipe({
            title: generatedTitle,
            source_url: generatedUrl,
            ingredients: result.ingredients,
            parsing_confidence: result.parsing_confidence,
          });

          // Navigate to recipe detail page
          router.push(`/recipes/${recipeId}`);
        } catch (err) {
          console.error("Failed to save recipe:", err);
          toast.error(RECIPES_STRINGS.errors.storageError);
        }
      } finally {
        setIsParsingText(false);
      }
    },
    [parseText, saveRecipe, router]
  );

  /**
   * Handle recipe card click - navigate to detail view
   */
  const handleRecipeClick = useCallback(
    async (id: string) => {
      // Update last accessed timestamp
      await updateLastAccessed(id);
      // Navigate to detail page
      router.push(`/recipes/${id}`);
    },
    [updateLastAccessed, router]
  );

  /**
   * Handle recipe deletion
   */
  const handleRecipeDelete = useCallback(
    async (id: string) => {
      try {
        await deleteRecipe(id);
        toast.success("Przepis został usunięty");
      } catch (err) {
        console.error("Failed to delete recipe:", err);
        toast.error(RECIPES_STRINGS.errors.storageError);
      }
    },
    [deleteRecipe]
  );

  const isLoading = isParsingUrl || isParsingText;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-24">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{RECIPES_STRINGS.page.title}</h1>
        <AIUsageIndicator usage={usage} />
      </header>

      {/* Recipe Input Section */}
      <RecipeInputSection
        onParseUrl={handleParseUrl}
        onParseText={handleParseText}
        isLoadingUrl={isParsingUrl}
        isLoadingText={isParsingText}
        urlError={urlError}
        textError={textError}
      />

      {/* Recent Recipes List */}
      <RecentRecipesList
        recipes={recipes}
        onRecipeClick={handleRecipeClick}
        onRecipeDelete={handleRecipeDelete}
        isLoading={isLoadingRecipes}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isLoading}
        message={isParsingText ? RECIPES_STRINGS.loading.parsingText : RECIPES_STRINGS.loading.parsingUrl}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
