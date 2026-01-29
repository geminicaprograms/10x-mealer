"use client";

/**
 * RecentRecipesList Component
 *
 * Displays a list of recently imported recipes stored in IndexedDB.
 * Shows empty state when no recipes exist. Each recipe card is clickable.
 */

import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type RecentRecipe, RECIPES_STRINGS } from "../types";
import { RecipeCard } from "./RecipeCard";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EmptyState } from "./EmptyState";

// =============================================================================
// Types
// =============================================================================

interface RecentRecipesListProps {
  /** List of recent recipes */
  recipes: RecentRecipe[];
  /** Handler called when a recipe card is clicked */
  onRecipeClick: (id: string) => void;
  /** Handler called when a recipe is deleted */
  onRecipeDelete: (id: string) => void;
  /** Whether the list is loading */
  isLoading: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Skeleton Component
// =============================================================================

function RecipeCardSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RecentRecipesList({
  recipes,
  onRecipeClick,
  onRecipeDelete,
  isLoading,
  className,
}: RecentRecipesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<RecentRecipe | null>(null);

  /**
   * Handle delete button click - open confirmation dialog
   */
  const handleDeleteClick = useCallback((recipe: RecentRecipe) => {
    setRecipeToDelete(recipe);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Handle confirmed deletion
   */
  const handleConfirmDelete = useCallback(() => {
    if (recipeToDelete) {
      onRecipeDelete(recipeToDelete.id);
      setRecipeToDelete(null);
    }
  }, [recipeToDelete, onRecipeDelete]);

  /**
   * Handle dialog close
   */
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setRecipeToDelete(null);
    }
  }, []);

  // Show skeletons while loading
  if (isLoading) {
    return (
      <section className={cn("space-y-4", className)} aria-busy="true" aria-label="Ładowanie przepisów">
        <h2 className="text-lg font-semibold">{RECIPES_STRINGS.recentRecipes.title}</h2>
        <div className="space-y-3">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      </section>
    );
  }

  // Show empty state if no recipes
  if (recipes.length === 0) {
    return (
      <section className={cn("space-y-4", className)}>
        <h2 className="text-lg font-semibold">{RECIPES_STRINGS.recentRecipes.title}</h2>
        <EmptyState />
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold">{RECIPES_STRINGS.recentRecipes.title}</h2>

      <ul className="space-y-3" role="list" aria-label="Lista ostatnich przepisów">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeCard
              recipe={recipe}
              onClick={() => onRecipeClick(recipe.id)}
              onDelete={() => handleDeleteClick(recipe)}
            />
          </li>
        ))}
      </ul>

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmDelete}
        recipeTitle={recipeToDelete?.title}
      />
    </section>
  );
}
