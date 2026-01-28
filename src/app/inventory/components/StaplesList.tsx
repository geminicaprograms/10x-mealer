"use client";

/**
 * StaplesList Component
 *
 * List container for staple toggle items.
 * Displays checkboxes for each staple with optimistic update support.
 */

import { useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type { InventoryItemDTO } from "@/types";
import { StapleToggle } from "./StapleToggle";
import { EmptyState } from "./EmptyState";

// =============================================================================
// Types
// =============================================================================

interface StaplesListProps {
  /** List of staple items (filtered to is_staple === true) */
  items: InventoryItemDTO[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Set of item IDs currently being updated */
  updatingIds?: Set<string>;
  /** Callback when a staple's availability is toggled */
  onToggle: (item: InventoryItemDTO, isAvailable: boolean) => void;
  /** Callback to initialize staples (for empty state) */
  onInitializeStaples?: () => void;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Ładowanie podstawowych produktów">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-1 py-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 max-w-[200px] flex-1" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function StaplesList({
  items,
  isLoading,
  updatingIds = new Set(),
  onToggle,
  onInitializeStaples,
}: StaplesListProps) {
  const handleToggle = useCallback(
    (item: InventoryItemDTO) => (isAvailable: boolean) => {
      onToggle(item, isAvailable);
    },
    [onToggle]
  );

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyState type="staples" onInitializeStaples={onInitializeStaples} />;
  }

  // Group staples by availability for better UX
  const availableStaples = items.filter((item) => item.is_available);
  const unavailableStaples = items.filter((item) => !item.is_available);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="text-muted-foreground text-sm">
        Masz {availableStaples.length} z {items.length} podstawowych produktów
      </div>

      {/* Main List */}
      <ul role="list" aria-label={`Lista podstawowych produktów (${items.length} elementów)`} className="space-y-1">
        {/* Unavailable items first (to encourage checking them off) */}
        {unavailableStaples.length > 0 && (
          <li>
            <div className="mb-2">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Brakujące ({unavailableStaples.length})
              </h3>
            </div>
            <ul className="space-y-1">
              {unavailableStaples.map((item) => (
                <li key={item.id}>
                  <StapleToggle item={item} onChange={handleToggle(item)} isUpdating={updatingIds.has(item.id)} />
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* Available items */}
        {availableStaples.length > 0 && (
          <li className={unavailableStaples.length > 0 ? "mt-4" : ""}>
            <div className="mb-2">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Dostępne ({availableStaples.length})
              </h3>
            </div>
            <ul className="space-y-1">
              {availableStaples.map((item) => (
                <li key={item.id}>
                  <StapleToggle item={item} onChange={handleToggle(item)} isUpdating={updatingIds.has(item.id)} />
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}
