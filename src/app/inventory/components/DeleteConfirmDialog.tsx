"use client";

/**
 * DeleteConfirmDialog Component
 *
 * Confirmation modal for deleting inventory items.
 * Supports single and batch deletion.
 */

import { useState, useCallback } from "react";

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

import type { InventoryItemDTO } from "@/types";
import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface DeleteConfirmDialogProps {
  /** Items to be deleted */
  items: InventoryItemDTO[];
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when delete is confirmed */
  onConfirm: () => Promise<void>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getItemDisplayName(item: InventoryItemDTO): string {
  if (item.product?.name_pl) {
    return item.product.name_pl;
  }
  return item.custom_name ?? "Nieznany produkt";
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmDialog({ items, isOpen, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error is handled by parent
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  }, [isDeleting, onOpenChange]);

  const isSingleItem = items.length === 1;
  const title = INVENTORY_STRINGS.dialogs.deleteTitle;
  const description = isSingleItem
    ? INVENTORY_STRINGS.dialogs.deleteConfirmation
    : INVENTORY_STRINGS.dialogs.deleteMultipleConfirmation(items.length);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* List items to be deleted (max 5 shown) */}
        {items.length > 0 && items.length <= 5 && (
          <ul className="text-muted-foreground my-2 space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="bg-muted-foreground h-1.5 w-1.5 rounded-full" />
                {getItemDisplayName(item)}
              </li>
            ))}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            {INVENTORY_STRINGS.actions.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Usuwanie...
              </>
            ) : (
              INVENTORY_STRINGS.actions.delete
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
