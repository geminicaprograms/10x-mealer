"use client";

/**
 * InventoryProductList Component
 *
 * Scrollable list container for inventory item cards.
 * Handles pagination and displays loading/empty states.
 */

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { InventoryItemDTO, PaginationDTO } from "@/types";
import { INVENTORY_STRINGS } from "../types";
import { InventoryItemCard } from "./InventoryItemCard";
import { EmptyState } from "./EmptyState";

// =============================================================================
// Types
// =============================================================================

interface InventoryProductListProps {
  /** List of inventory items to display */
  items: InventoryItemDTO[];
  /** Pagination information */
  pagination: PaginationDTO;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether more items are being loaded */
  isLoadingMore: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Set of item IDs currently being updated */
  updatingIds?: Set<string>;
  /** Set of item IDs currently being deleted */
  deletingIds?: Set<string>;
  /** Whether this is showing search/filter results with no matches */
  isFiltered?: boolean;
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Callback when edit is clicked on an item */
  onEditItem: (item: InventoryItemDTO) => void;
  /** Callback when delete is clicked on an item */
  onDeleteItem: (item: InventoryItemDTO) => void;
  /** Callback to scan receipt (for empty state) */
  onScanReceipt?: () => void;
  /** Callback to quick add (for empty state) */
  onQuickAdd?: () => void;
  /** Callback to clear filters (for empty filtered state) */
  onClearFilters?: () => void;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Ładowanie produktów">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Load More Button
// =============================================================================

interface LoadMoreButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

function LoadMoreButton({ isLoading, onClick }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading} className="min-w-[200px]">
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Ładowanie...
          </>
        ) : (
          INVENTORY_STRINGS.actions.loadMore
        )}
      </Button>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function InventoryProductList({
  items,
  pagination,
  isLoading,
  isLoadingMore,
  hasMore,
  updatingIds = new Set(),
  deletingIds = new Set(),
  isFiltered = false,
  onLoadMore,
  onEditItem,
  onDeleteItem,
  onScanReceipt,
  onQuickAdd,
  onClearFilters,
}: InventoryProductListProps) {
  const handleLoadMore = useCallback(() => {
    onLoadMore();
  }, [onLoadMore]);

  // Loading state (initial load)
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (items.length === 0) {
    if (isFiltered) {
      return <EmptyState type="search" onClearFilters={onClearFilters} />;
    }

    return <EmptyState type="products" onScanReceipt={onScanReceipt} onQuickAdd={onQuickAdd} />;
  }

  return (
    <div>
      {/* Items List */}
      <ul className="space-y-3" role="list" aria-label={`Lista produktów (${pagination.total_items} elementów)`}>
        {items.map((item) => (
          <li key={item.id}>
            <InventoryItemCard
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              isUpdating={updatingIds.has(item.id)}
              isDeleting={deletingIds.has(item.id)}
            />
          </li>
        ))}
      </ul>

      {/* Load More */}
      {hasMore && <LoadMoreButton isLoading={isLoadingMore} onClick={handleLoadMore} />}

      {/* Results Summary */}
      <div className="text-muted-foreground mt-4 text-center text-sm">
        Wyświetlono {items.length} z {pagination.total_items} produktów
      </div>
    </div>
  );
}
