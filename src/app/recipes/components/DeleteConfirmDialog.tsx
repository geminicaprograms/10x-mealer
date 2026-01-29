"use client";

/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for deleting a recipe.
 * Uses AlertDialog from shadcn/ui for accessible modal experience.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RECIPES_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Handler called when dialog is closed (cancelled or confirmed) */
  onOpenChange: (open: boolean) => void;
  /** Handler called when deletion is confirmed */
  onConfirm: () => void;
  /** Recipe title for display in the dialog */
  recipeTitle?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmDialog({ isOpen, onOpenChange, onConfirm, recipeTitle }: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{RECIPES_STRINGS.recentRecipes.deleteConfirm.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {recipeTitle ? (
              <>
                Czy na pewno chcesz usunąć przepis <strong>&quot;{recipeTitle}&quot;</strong>? Tej akcji nie można
                cofnąć.
              </>
            ) : (
              RECIPES_STRINGS.recentRecipes.deleteConfirm.description
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{RECIPES_STRINGS.recentRecipes.deleteConfirm.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {RECIPES_STRINGS.recentRecipes.deleteConfirm.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
