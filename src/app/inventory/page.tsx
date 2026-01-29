"use client";

/**
 * Inventory Page
 *
 * Main page component for the inventory view. Orchestrates all inventory-related
 * components and state management through the useInventory hook.
 *
 * Route: /inventory
 * Protection: Requires authentication via Next.js middleware
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import type { InventoryItemDTO, InventoryItemCreateCommand } from "@/types";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Header } from "@/components/Header";

import { useInventory } from "./hooks/useInventory";
import {
  InventoryTabs,
  FilterSortRow,
  InventoryProductList,
  StaplesList,
  QuickAddSheet,
  EditItemDialog,
  DeleteConfirmDialog,
  FloatingActionButton,
} from "./components";
import { DEFAULT_FILTER_STATE } from "./types";

// =============================================================================
// Page Component
// =============================================================================

export default function InventoryPage() {
  const router = useRouter();

  // Main inventory state from custom hook
  const {
    activeTab,
    products,
    staples,
    filters,
    pagination,
    categories,
    units,
    isLoading,
    isLoadingMore,
    hasMoreProducts,
    productsCount,
    staplesCount,
    setActiveTab,
    setFilters,
    loadMore,
    updateItem,
    deleteItems,
    toggleStaple,
    addItem,
    initializeStaples,
  } = useInventory();

  // Modal states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDTO | null>(null);
  const [deletingItems, setDeletingItems] = useState<InventoryItemDTO[]>([]);

  // Track items being updated/deleted for UI feedback
  const [updatingIds] = useState<Set<string>>(new Set());
  const [deletingIds] = useState<Set<string>>(new Set());

  // Check if filters are active (for empty state handling)
  const isFiltered = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.categoryId !== null ||
      filters.sortBy !== DEFAULT_FILTER_STATE.sortBy ||
      filters.sortOrder !== DEFAULT_FILTER_STATE.sortOrder
    );
  }, [filters]);

  // ---------------------------------------------------------------------------
  // Navigation Handlers
  // ---------------------------------------------------------------------------

  const handleScanClick = useCallback(() => {
    router.push("/inventory/scan");
  }, [router]);

  // ---------------------------------------------------------------------------
  // Quick Add Handlers
  // ---------------------------------------------------------------------------

  const handleQuickAddClick = useCallback(() => {
    setIsQuickAddOpen(true);
  }, []);

  const handleQuickAddSubmit = useCallback(
    async (item: InventoryItemCreateCommand) => {
      await addItem(item);
    },
    [addItem]
  );

  // ---------------------------------------------------------------------------
  // Edit Handlers
  // ---------------------------------------------------------------------------

  const handleEditItem = useCallback((item: InventoryItemDTO) => {
    setEditingItem(item);
  }, []);

  const handleEditSave = useCallback(
    async (id: string, data: Parameters<typeof updateItem>[1]) => {
      await updateItem(id, data);
    },
    [updateItem]
  );

  // ---------------------------------------------------------------------------
  // Delete Handlers
  // ---------------------------------------------------------------------------

  const handleDeleteItem = useCallback((item: InventoryItemDTO) => {
    setDeletingItems([item]);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const ids = deletingItems.map((item) => item.id);
    await deleteItems(ids);
    setDeletingItems([]);
  }, [deletingItems, deleteItems]);

  // ---------------------------------------------------------------------------
  // Staple Handlers
  // ---------------------------------------------------------------------------

  const handleStapleToggle = useCallback(
    (item: InventoryItemDTO, isAvailable: boolean) => {
      // The toggleStaple function handles the optimistic update
      toggleStaple({ ...item, is_available: !isAvailable });
    },
    [toggleStaple]
  );

  const handleInitializeStaples = useCallback(() => {
    initializeStaples();
  }, [initializeStaples]);

  // ---------------------------------------------------------------------------
  // Filter Handlers
  // ---------------------------------------------------------------------------

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, [setFilters]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <Header showSettings />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-32" role="main" aria-label="Zarządzanie inwentarzem">
        <InventoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          productsCount={productsCount}
          staplesCount={staplesCount}
          productsContent={
            <>
              {/* Filter/Sort Controls */}
              <FilterSortRow
                categories={categories}
                filters={filters}
                onFiltersChange={setFilters}
                isLoading={isLoading}
              />

              {/* Products List */}
              <InventoryProductList
                items={products}
                pagination={pagination}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={hasMoreProducts}
                updatingIds={updatingIds}
                deletingIds={deletingIds}
                isFiltered={isFiltered && products.length === 0}
                onLoadMore={loadMore}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onScanReceipt={handleScanClick}
                onQuickAdd={handleQuickAddClick}
                onClearFilters={handleClearFilters}
              />
            </>
          }
          staplesContent={
            <StaplesList
              items={staples}
              isLoading={isLoading && staples.length === 0}
              updatingIds={updatingIds}
              onToggle={handleStapleToggle}
              onInitializeStaples={handleInitializeStaples}
            />
          }
        />
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton onScanClick={handleScanClick} onQuickAddClick={handleQuickAddClick} />

      {/* Quick Add Sheet */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        onSubmit={handleQuickAddSubmit}
        units={units}
      />

      {/* Edit Item Dialog */}
      <EditItemDialog
        item={editingItem}
        units={units}
        isOpen={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSave={handleEditSave}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        items={deletingItems}
        isOpen={deletingItems.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeletingItems([]);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
