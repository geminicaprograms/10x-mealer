"use client";

/**
 * VerificationList Component
 *
 * Scrollable list of extracted items for verification.
 * Items sorted by confidence (lowest first for review priority).
 */

import { useCallback } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { VerificationItem } from "./VerificationItem";
import { SCAN_STRINGS, type VerificationItemViewModel } from "../types";
import type { UnitDTO } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface VerificationListProps {
  /** List of verification items */
  items: VerificationItemViewModel[];
  /** Available units for selection */
  units: UnitDTO[];
  /** Callback when an item is updated */
  onItemUpdate: (index: number, item: VerificationItemViewModel) => void;
  /** Callback when an item is deleted */
  onItemDelete: (index: number) => void;
  /** Whether all items are disabled */
  disabled: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function VerificationList({ items, units, onItemUpdate, onItemDelete, disabled }: VerificationListProps) {
  // Create stable callbacks for each item
  const createUpdateHandler = useCallback(
    (index: number) => (item: VerificationItemViewModel) => {
      onItemUpdate(index, item);
    },
    [onItemUpdate]
  );

  const createDeleteHandler = useCallback(
    (index: number) => () => {
      onItemDelete(index);
    },
    [onItemDelete]
  );

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{SCAN_STRINGS.verification.noItemsExtracted}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{SCAN_STRINGS.verification.title}</h2>
        <span className="text-muted-foreground text-sm">{SCAN_STRINGS.verification.itemCount(items.length)}</span>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
        <div className="space-y-3 pr-4" role="list" aria-label={SCAN_STRINGS.verification.title}>
          {items.map((item, index) => (
            <VerificationItem
              key={item.id}
              item={item}
              index={index}
              units={units}
              onUpdate={createUpdateHandler(index)}
              onDelete={createDeleteHandler(index)}
              disabled={disabled}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
