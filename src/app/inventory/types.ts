/**
 * View Model Types for Inventory View
 *
 * These types are specific to the Inventory view UI and extend/complement
 * the DTOs defined in src/types.ts
 */

import type { InventoryItemDTO, CategoryDTO, UnitDTO } from "@/types";

// =============================================================================
// Tab Types
// =============================================================================

/** Active tab in the inventory view */
export type InventoryTab = "products" | "staples";

// =============================================================================
// Filter and Sort Types
// =============================================================================

/** Sort field options for products list */
export type SortField = "name" | "created_at" | "updated_at";

/** Sort direction */
export type SortOrder = "asc" | "desc";

/** Filter state for Products tab */
export interface FilterState {
  /** Search query (max 100 chars) */
  search: string;
  /** Filter by category ID, null = all categories */
  categoryId: number | null;
  /** Sort field */
  sortBy: SortField;
  /** Sort direction */
  sortOrder: SortOrder;
}

/** Default filter state */
export const DEFAULT_FILTER_STATE: FilterState = {
  search: "",
  categoryId: null,
  sortBy: "created_at",
  sortOrder: "desc",
};

// =============================================================================
// Loading State Types
// =============================================================================

/** Loading state for async operations */
export interface LoadingState {
  /** First page load */
  initialLoad: boolean;
  /** Pagination load */
  loadingMore: boolean;
  /** IDs of items currently being updated */
  updating: Set<string>;
  /** IDs of items currently being deleted */
  deleting: Set<string>;
}

/** Default loading state */
export const DEFAULT_LOADING_STATE: LoadingState = {
  initialLoad: true,
  loadingMore: false,
  updating: new Set(),
  deleting: new Set(),
};

// =============================================================================
// View State Types
// =============================================================================

/** View-level state combining all data */
export interface InventoryViewState {
  /** Currently active tab */
  activeTab: InventoryTab;
  /** Quantitative inventory items (is_staple = false) */
  products: InventoryItemDTO[];
  /** Staple items (is_staple = true) */
  staples: InventoryItemDTO[];
  /** Current filter/sort state for products */
  filters: FilterState;
  /** Pagination info for products */
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
  };
  /** Available categories for filtering */
  categories: CategoryDTO[];
  /** Available units for editing/adding */
  units: UnitDTO[];
  /** Loading states */
  loading: LoadingState;
  /** Current error message, null if none */
  error: string | null;
}

// =============================================================================
// Form State Types
// =============================================================================

/** Quick add form state */
export interface QuickAddFormState {
  /** Selected product ID from catalog */
  productId: number | null;
  /** Custom product name if not from catalog */
  customName: string;
  /** Quantity value (string for controlled input) */
  quantity: string;
  /** Selected unit ID */
  unitId: number | null;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Field-level validation errors */
  errors: Record<string, string>;
}

/** Default quick add form state */
export const DEFAULT_QUICK_ADD_FORM_STATE: QuickAddFormState = {
  productId: null,
  customName: "",
  quantity: "",
  unitId: null,
  isSubmitting: false,
  errors: {},
};

/** Edit item form state */
export interface EditItemFormState {
  /** Quantity value (string for controlled input) */
  quantity: string;
  /** Selected unit ID */
  unitId: number | null;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Field-level validation errors */
  errors: Record<string, string>;
}

/** Default edit item form state */
export const DEFAULT_EDIT_FORM_STATE: EditItemFormState = {
  quantity: "",
  unitId: null,
  isSubmitting: false,
  errors: {},
};

// =============================================================================
// API Error Types
// =============================================================================

/** Parsed API error structure */
export interface ApiError {
  /** Error code from API */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Optional field-level error details */
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// =============================================================================
// Polish UI Strings
// =============================================================================

/** Polish strings for the inventory view */
export const INVENTORY_STRINGS = {
  // Tab labels
  tabs: {
    products: "Produkty",
    staples: "Podstawowe",
  },

  // Filter labels
  filters: {
    searchPlaceholder: "Szukaj produktów...",
    allCategories: "Wszystkie kategorie",
    sortByName: "Nazwa",
    sortByDateAdded: "Data dodania",
    sortByDateUpdated: "Ostatnia aktualizacja",
    ascending: "Rosnąco",
    descending: "Malejąco",
  },

  // Empty states
  emptyState: {
    productsTitle: "Twoja spiżarnia jest pusta",
    productsDescription: "Dodaj produkty skanując paragon lub ręcznie dodając produkty.",
    staplesTitle: "Nie masz jeszcze podstawowych produktów",
    staplesDescription: "Zainicjuj listę podstawowych produktów, które zwykle masz w domu.",
    noSearchResults: "Nie znaleziono produktów",
    noSearchResultsDescription: "Spróbuj zmienić kryteria wyszukiwania.",
  },

  // Actions
  actions: {
    scanReceipt: "Zeskanuj paragon",
    quickAdd: "Dodaj produkt",
    initializeStaples: "Zainicjuj produkty",
    loadMore: "Załaduj więcej",
    edit: "Edytuj",
    delete: "Usuń",
    save: "Zapisz",
    cancel: "Anuluj",
    add: "Dodaj",
    clearFilters: "Wyczyść filtry",
  },

  // Dialogs
  dialogs: {
    editTitle: "Edytuj produkt",
    deleteTitle: "Usuń produkt",
    deleteConfirmation: "Czy na pewno chcesz usunąć ten produkt?",
    deleteMultipleConfirmation: (count: number) => `Czy na pewno chcesz usunąć ${count} produktów?`,
    quickAddTitle: "Dodaj produkt",
  },

  // Form labels
  form: {
    product: "Produkt",
    productPlaceholder: "Wybierz lub wpisz nazwę...",
    quantity: "Ilość",
    quantityPlaceholder: "np. 500",
    unit: "Jednostka",
    unitPlaceholder: "Wybierz jednostkę",
  },

  // Validation messages
  validation: {
    searchTooLong: "Wyszukiwanie nie może przekraczać 100 znaków",
    quantityRequired: "Podaj ilość",
    quantityPositive: "Ilość musi być liczbą dodatnią",
    productRequired: "Wybierz produkt lub wpisz własną nazwę",
    unitRequired: "Wybierz jednostkę",
  },

  // Error messages
  errors: {
    networkError: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
    serverError: "Wystąpił błąd serwera. Spróbuj ponownie.",
    notFound: "Element nie został znaleziony",
    updateFailed: "Nie udało się zaktualizować. Spróbuj ponownie.",
    deleteFailed: "Nie udało się usunąć. Spróbuj ponownie.",
    loadFailed: "Nie udało się załadować danych. Spróbuj ponownie.",
  },

  // Success messages
  success: {
    itemAdded: "Produkt został dodany",
    itemUpdated: "Produkt został zaktualizowany",
    itemDeleted: "Produkt został usunięty",
    itemsDeleted: (count: number) => `Usunięto ${count} produktów`,
    staplesInitialized: "Podstawowe produkty zostały zainicjowane",
  },
} as const;
