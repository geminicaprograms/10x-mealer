"use client";

/**
 * useInventory Hook
 *
 * Custom hook that encapsulates all inventory-related state and logic.
 * Provides state management, API integration, and optimistic updates.
 */

import { useState, useCallback, useEffect, useTransition } from "react";
import { toast } from "sonner";

import type {
  InventoryItemDTO,
  CategoryDTO,
  UnitDTO,
  PaginationDTO,
  InventoryItemCreateCommand,
  InventoryItemUpdateCommand,
} from "@/types";

import { inventoryApi, categoriesApi, unitsApi, InventoryApiError } from "@/lib/services/inventory-api";

import type { InventoryTab, FilterState, LoadingState } from "../types";
import { DEFAULT_FILTER_STATE, DEFAULT_LOADING_STATE, INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Return type for useInventory hook */
export interface UseInventoryReturn {
  // State
  activeTab: InventoryTab;
  products: InventoryItemDTO[];
  staples: InventoryItemDTO[];
  filters: FilterState;
  pagination: PaginationDTO;
  categories: CategoryDTO[];
  units: UnitDTO[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Computed
  hasMoreProducts: boolean;
  productsCount: number;
  staplesCount: number;

  // Actions
  setActiveTab: (tab: InventoryTab) => void;
  setFilters: (filters: FilterState) => void;
  loadMore: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  updateItem: (id: string, data: InventoryItemUpdateCommand) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  toggleStaple: (item: InventoryItemDTO) => Promise<void>;
  addItem: (item: InventoryItemCreateCommand) => Promise<InventoryItemDTO | null>;
  initializeStaples: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInventory(): UseInventoryReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTabState] = useState<InventoryTab>("products");
  const [products, setProducts] = useState<InventoryItemDTO[]>([]);
  const [staples, setStaples] = useState<InventoryItemDTO[]>([]);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [pagination, setPagination] = useState<PaginationDTO>({
    page: 1,
    limit: 50,
    total_items: 0,
  });
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [units, setUnits] = useState<UnitDTO[]>([]);
  const [loading, setLoading] = useState<LoadingState>(DEFAULT_LOADING_STATE);
  const [error, setError] = useState<string | null>(null);
  const [staplesLoaded, setStaplesLoaded] = useState(false);

  // useTransition for non-blocking updates
  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const isLoading = loading.initialLoad;
  const isLoadingMore = loading.loadingMore;
  const hasMoreProducts = pagination.page * pagination.limit < pagination.total_items;
  const productsCount = pagination.total_items;
  const staplesCount = staples.length;

  // ---------------------------------------------------------------------------
  // Error Handler
  // ---------------------------------------------------------------------------

  const handleError = useCallback((err: unknown, fallbackMessage: string) => {
    console.error("Inventory error:", err);

    if (err instanceof InventoryApiError) {
      if (err.status === 401) {
        // Session expired - redirect to login
        toast.error("Sesja wygasła. Zaloguj się ponownie.");
        window.location.href = "/login";
        return;
      }
      toast.error(err.message);
      setError(err.message);
    } else if (err instanceof Error) {
      if (err.message.includes("fetch")) {
        toast.error(INVENTORY_STRINGS.errors.networkError);
        setError(INVENTORY_STRINGS.errors.networkError);
      } else {
        toast.error(fallbackMessage);
        setError(fallbackMessage);
      }
    } else {
      toast.error(fallbackMessage);
      setError(fallbackMessage);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Data Loading Functions
  // ---------------------------------------------------------------------------

  /**
   * Loads categories and units (reference data).
   */
  const loadReferenceData = useCallback(async () => {
    try {
      const [categoriesRes, unitsRes] = await Promise.all([categoriesApi.list(), unitsApi.list()]);

      setCategories(categoriesRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      // Non-critical error - continue without reference data
      console.error("Failed to load reference data:", err);
    }
  }, []);

  /**
   * Loads products with current filters.
   */
  const loadProducts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!append) {
        setLoading((prev) => ({ ...prev, initialLoad: true }));
      } else {
        setLoading((prev) => ({ ...prev, loadingMore: true }));
      }
      setError(null);

      try {
        const response = await inventoryApi.listProducts(filters, page, 50);

        startTransition(() => {
          if (append) {
            setProducts((prev) => [...prev, ...response.data]);
          } else {
            setProducts(response.data);
          }
          setPagination(response.pagination);
        });
      } catch (err) {
        handleError(err, INVENTORY_STRINGS.errors.loadFailed);
      } finally {
        setLoading((prev) => ({
          ...prev,
          initialLoad: false,
          loadingMore: false,
        }));
      }
    },
    [filters, handleError]
  );

  /**
   * Loads staples list.
   */
  const loadStaples = useCallback(async () => {
    if (staplesLoaded) return;

    try {
      const response = await inventoryApi.listStaples();
      setStaples(response.data);
      setStaplesLoaded(true);
    } catch (err) {
      handleError(err, INVENTORY_STRINGS.errors.loadFailed);
    }
  }, [staplesLoaded, handleError]);

  // ---------------------------------------------------------------------------
  // Initial Load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadReferenceData(), loadProducts(1, false)]);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Filter Change Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Skip on initial mount
    if (loading.initialLoad) return;

    loadProducts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ---------------------------------------------------------------------------
  // Tab Change Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (activeTab === "staples" && !staplesLoaded) {
      loadStaples();
    }
  }, [activeTab, staplesLoaded, loadStaples]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Sets the active tab.
   */
  const setActiveTab = useCallback((tab: InventoryTab) => {
    setActiveTabState(tab);
  }, []);

  /**
   * Sets filters and triggers reload.
   */
  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
  }, []);

  /**
   * Loads more products (pagination).
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreProducts) return;

    const nextPage = pagination.page + 1;
    await loadProducts(nextPage, true);
  }, [isLoadingMore, hasMoreProducts, pagination.page, loadProducts]);

  /**
   * Refreshes the current view.
   */
  const refreshInventory = useCallback(async () => {
    if (activeTab === "products") {
      await loadProducts(1, false);
    } else {
      setStaplesLoaded(false);
      await loadStaples();
    }
  }, [activeTab, loadProducts, loadStaples]);

  /**
   * Updates an inventory item.
   */
  const updateItem = useCallback(
    async (id: string, data: InventoryItemUpdateCommand) => {
      setLoading((prev) => ({
        ...prev,
        updating: new Set(prev.updating).add(id),
      }));

      try {
        const updatedItem = await inventoryApi.update(id, data);

        startTransition(() => {
          // Update in products list
          setProducts((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));

          // Update in staples list
          setStaples((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
        });

        toast.success(INVENTORY_STRINGS.success.itemUpdated);
      } catch (err) {
        handleError(err, INVENTORY_STRINGS.errors.updateFailed);
        throw err;
      } finally {
        setLoading((prev) => {
          const updating = new Set(prev.updating);
          updating.delete(id);
          return { ...prev, updating };
        });
      }
    },
    [handleError]
  );

  /**
   * Deletes inventory items.
   */
  const deleteItems = useCallback(
    async (ids: string[]) => {
      setLoading((prev) => ({
        ...prev,
        deleting: new Set([...prev.deleting, ...ids]),
      }));

      try {
        const response = await inventoryApi.delete(ids);

        startTransition(() => {
          const deletedSet = new Set(response.deleted);

          // Remove from products list
          setProducts((prev) => prev.filter((item) => !deletedSet.has(item.id)));

          // Remove from staples list
          setStaples((prev) => prev.filter((item) => !deletedSet.has(item.id)));

          // Update pagination count
          setPagination((prev) => ({
            ...prev,
            total_items: Math.max(0, prev.total_items - response.deleted.length),
          }));
        });

        if (response.deleted.length === 1) {
          toast.success(INVENTORY_STRINGS.success.itemDeleted);
        } else {
          toast.success(INVENTORY_STRINGS.success.itemsDeleted(response.deleted.length));
        }

        if (response.errors.length > 0) {
          toast.error(`${response.errors.length} elementów nie udało się usunąć`);
        }
      } catch (err) {
        handleError(err, INVENTORY_STRINGS.errors.deleteFailed);
        throw err;
      } finally {
        setLoading((prev) => {
          const deleting = new Set(prev.deleting);
          ids.forEach((id) => deleting.delete(id));
          return { ...prev, deleting };
        });
      }
    },
    [handleError]
  );

  /**
   * Toggles staple availability with optimistic update.
   */
  const toggleStaple = useCallback(
    async (item: InventoryItemDTO) => {
      const previousValue = item.is_available;
      const newValue = !previousValue;

      // Optimistic update
      setStaples((prev) => prev.map((s) => (s.id === item.id ? { ...s, is_available: newValue } : s)));

      try {
        await inventoryApi.update(item.id, { is_available: newValue });
      } catch (err) {
        // Rollback on error
        setStaples((prev) => prev.map((s) => (s.id === item.id ? { ...s, is_available: previousValue } : s)));
        handleError(err, INVENTORY_STRINGS.errors.updateFailed);
      }
    },
    [handleError]
  );

  /**
   * Adds a new inventory item.
   */
  const addItem = useCallback(
    async (item: InventoryItemCreateCommand): Promise<InventoryItemDTO | null> => {
      try {
        const createdItem = await inventoryApi.createSingle(item);

        startTransition(() => {
          if (item.is_staple) {
            setStaples((prev) => [...prev, createdItem]);
          } else {
            // Add to beginning of products list
            setProducts((prev) => [createdItem, ...prev]);
            setPagination((prev) => ({
              ...prev,
              total_items: prev.total_items + 1,
            }));
          }
        });

        toast.success(INVENTORY_STRINGS.success.itemAdded);
        return createdItem;
      } catch (err) {
        handleError(err, "Nie udało się dodać produktu");
        return null;
      }
    },
    [handleError]
  );

  /**
   * Initializes staples from system definitions.
   */
  const initializeStaples = useCallback(async () => {
    try {
      const response = await inventoryApi.initializeStaples(false);

      setStaples(
        response.staples.map((s) => ({
          id: s.id,
          product_id: s.product_id,
          product: s.product ? { ...s.product, category: null } : null,
          custom_name: null,
          quantity: null,
          unit: null,
          is_staple: true,
          is_available: s.is_available,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );
      setStaplesLoaded(true);

      toast.success(INVENTORY_STRINGS.success.staplesInitialized);
    } catch (err) {
      handleError(err, "Nie udało się zainicjować podstawowych produktów");
    }
  }, [handleError]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    activeTab,
    products,
    staples,
    filters,
    pagination,
    categories,
    units,
    isLoading: isLoading || isPending,
    isLoadingMore,
    error,

    // Computed
    hasMoreProducts,
    productsCount,
    staplesCount,

    // Actions
    setActiveTab,
    setFilters,
    loadMore,
    refreshInventory,
    updateItem,
    deleteItems,
    toggleStaple,
    addItem,
    initializeStaples,
  };
}
