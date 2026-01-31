"use client";

/**
 * CookedThisDialog Component
 *
 * Modal dialog for confirming and adjusting ingredient deductions
 * before updating inventory. Allows users to modify estimated quantities.
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeductionItem } from "./DeductionItem";
import type { DeductionItemViewModel } from "../types";
import type { InventoryDeductionItemCommand } from "@/types";
import { RECIPE_DETAIL_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface CookedThisDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Initial deduction items */
  ingredients: DeductionItemViewModel[];
  /** Callback to confirm deductions */
  onConfirm: (deductions: InventoryDeductionItemCommand[]) => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CookedThisDialog({ open, onOpenChange, ingredients, onConfirm, isSubmitting }: CookedThisDialogProps) {
  // Local state for adjusted quantities
  const [items, setItems] = useState<DeductionItemViewModel[]>(ingredients);
  // Track open state for detecting transitions
  const [wasOpen, setWasOpen] = useState(open);

  // Ref for the first input for focus management
  const firstInputRef = useRef<HTMLDivElement>(null);

  // Reset items when dialog opens (transition from closed to open)
  if (open && !wasOpen) {
    setItems(ingredients);
    setWasOpen(true);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // Focus management: focus first input when dialog opens
  useEffect(() => {
    if (open && firstInputRef.current) {
      // Delay to allow dialog animation to complete
      const timeoutId = setTimeout(() => {
        const firstInput = firstInputRef.current?.querySelector("input");
        firstInput?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  /**
   * Handle quantity change for a specific item
   */
  const handleQuantityChange = useCallback((inventoryItemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.inventoryItemId === inventoryItemId ? { ...item, adjustedQuantity: quantity } : item))
    );
  }, []);

  /**
   * Check if there are any deductions to make
   */
  const hasDeductions = items.some((item) => item.adjustedQuantity > 0);

  /**
   * Count items with quantity exceeding inventory
   */
  const exceedsInventoryCount = items.filter((item) => item.adjustedQuantity > item.currentInventoryQuantity).length;

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Filter items with positive quantities and map to API format
    const deductions: InventoryDeductionItemCommand[] = items
      .filter((item) => item.adjustedQuantity > 0)
      .map((item) => ({
        inventory_item_id: item.inventoryItemId,
        quantity: item.adjustedQuantity,
      }));

    // If no deductions, just close the dialog
    if (deductions.length === 0) {
      onOpenChange(false);
      return;
    }

    await onConfirm(deductions);
  }, [items, onConfirm, onOpenChange]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /**
   * Handle keyboard shortcut for submit
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Submit on Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [isSubmitting, handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown} aria-describedby="deduction-dialog-description">
        <DialogHeader>
          <DialogTitle>{RECIPE_DETAIL_STRINGS.cookedThis.dialogTitle}</DialogTitle>
          <DialogDescription id="deduction-dialog-description">
            {RECIPE_DETAIL_STRINGS.cookedThis.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Deduction items list */}
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-0" role="list" aria-label="Lista składników do odliczenia">
            {items.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Brak składników do odliczenia</p>
            ) : (
              items.map((item, index) => (
                <div key={item.inventoryItemId} ref={index === 0 ? firstInputRef : undefined}>
                  <DeductionItem
                    item={item}
                    onChange={(quantity) => handleQuantityChange(item.inventoryItemId, quantity)}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Warning if any items exceed inventory */}
        {exceedsInventoryCount > 0 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-500" role="alert">
            ⚠️ {exceedsInventoryCount} {exceedsInventoryCount === 1 ? "składnik przekracza" : "składników przekracza"}{" "}
            stan magazynowy
          </p>
        )}

        {/* Info message when no deductions will be made */}
        {!hasDeductions && items.length > 0 && (
          <p className="text-muted-foreground text-center text-xs">
            Brak zmian do zapisania - kliknij Potwierdź, aby zamknąć
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
            {RECIPE_DETAIL_STRINGS.cookedThis.cancelButton}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} type="button">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Zapisuję...</span>
              </>
            ) : (
              RECIPE_DETAIL_STRINGS.cookedThis.confirmButton
            )}
          </Button>
        </DialogFooter>

        {/* Live region for submission status */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isSubmitting && "Zapisywanie zmian w spiżarni..."}
        </div>
      </DialogContent>
    </Dialog>
  );
}
