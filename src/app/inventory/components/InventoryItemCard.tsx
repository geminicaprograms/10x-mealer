"use client";

/**
 * InventoryItemCard Component
 *
 * Card displaying a single inventory item with product name, quantity, unit,
 * category badge, and action buttons for editing and deleting.
 */

import { memo, useCallback } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { InventoryItemDTO } from "@/types";
import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface InventoryItemCardProps {
  /** The inventory item to display */
  item: InventoryItemDTO;
  /** Callback when edit is clicked */
  onEdit: (item: InventoryItemDTO) => void;
  /** Callback when delete is clicked */
  onDelete: (item: InventoryItemDTO) => void;
  /** Whether the item is being updated */
  isUpdating?: boolean;
  /** Whether the item is being deleted */
  isDeleting?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the display name for an inventory item.
 */
function getItemDisplayName(item: InventoryItemDTO): string {
  if (item.product?.name_pl) {
    return item.product.name_pl;
  }
  return item.custom_name ?? "Nieznany produkt";
}

/**
 * Formats quantity with unit abbreviation.
 */
function formatQuantity(item: InventoryItemDTO): string | null {
  if (item.quantity === null) {
    return null;
  }

  const unit = item.unit?.abbreviation ?? "";
  return `${item.quantity}${unit ? ` ${unit}` : ""}`;
}

// =============================================================================
// Component
// =============================================================================

function InventoryItemCardComponent({
  item,
  onEdit,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: InventoryItemCardProps) {
  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(item);
  }, [item, onDelete]);

  const displayName = getItemDisplayName(item);
  const quantity = formatQuantity(item);
  const category = item.product?.category?.name_pl;
  const isDisabled = isUpdating || isDeleting;

  return (
    <Card className={`transition-opacity ${isDeleting ? "opacity-50" : ""}`} data-testid="inventory-item-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Product Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate font-medium">{displayName}</h3>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {/* Quantity */}
              {quantity && <span className="text-muted-foreground text-sm font-medium">{quantity}</span>}

              {/* Category Badge */}
              {category && (
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              disabled={isDisabled}
              aria-label={`${INVENTORY_STRINGS.actions.edit} ${displayName}`}
              className="h-8 w-8"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDisabled}
              aria-label={`${INVENTORY_STRINGS.actions.delete} ${displayName}`}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders
export const InventoryItemCard = memo(InventoryItemCardComponent);
