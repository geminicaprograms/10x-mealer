"use client";

/**
 * FilterSortRow Component
 *
 * Horizontal row of filtering and sorting controls for the Products tab.
 * Includes search input, category filter, and sort options.
 */

import { useState, useEffect, useCallback, useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CategoryDTO } from "@/types";
import type { FilterState, SortField, SortOrder } from "../types";
import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface FilterSortRowProps {
  /** Available categories for filtering */
  categories: CategoryDTO[];
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: FilterState) => void;
  /** Whether data is loading */
  isLoading: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}> = [
  {
    label: `${INVENTORY_STRINGS.filters.sortByDateAdded} (${INVENTORY_STRINGS.filters.descending})`,
    sortBy: "created_at",
    sortOrder: "desc",
  },
  {
    label: `${INVENTORY_STRINGS.filters.sortByDateAdded} (${INVENTORY_STRINGS.filters.ascending})`,
    sortBy: "created_at",
    sortOrder: "asc",
  },
  {
    label: `${INVENTORY_STRINGS.filters.sortByName} (A-Z)`,
    sortBy: "name",
    sortOrder: "asc",
  },
  {
    label: `${INVENTORY_STRINGS.filters.sortByName} (Z-A)`,
    sortBy: "name",
    sortOrder: "desc",
  },
  {
    label: `${INVENTORY_STRINGS.filters.sortByDateUpdated} (${INVENTORY_STRINGS.filters.descending})`,
    sortBy: "updated_at",
    sortOrder: "desc",
  },
  {
    label: `${INVENTORY_STRINGS.filters.sortByDateUpdated} (${INVENTORY_STRINGS.filters.ascending})`,
    sortBy: "updated_at",
    sortOrder: "asc",
  },
];

// =============================================================================
// Component
// =============================================================================

export function FilterSortRow({ categories, filters, onFiltersChange, isLoading }: FilterSortRowProps) {
  const searchId = useId();
  const categoryId = useId();
  const sortId = useId();

  // Local search input state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sync local search with external filter state
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounced search handler
  useEffect(() => {
    // Validate search length
    if (searchInput.length > SEARCH_MAX_LENGTH) {
      setSearchError(INVENTORY_STRINGS.validation.searchTooLong);
      return;
    }

    setSearchError(null);

    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleCategoryChange = useCallback(
    (value: string) => {
      const categoryId = value === "all" ? null : parseInt(value, 10);
      onFiltersChange({ ...filters, categoryId });
    },
    [filters, onFiltersChange]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortOrder] = value.split("-") as [SortField, SortOrder];
      onFiltersChange({ ...filters, sortBy, sortOrder });
    },
    [filters, onFiltersChange]
  );

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;
  const currentCategoryValue = filters.categoryId !== null ? String(filters.categoryId) : "all";

  return (
    <div className="mb-4 space-y-3">
      {/* Search Input */}
      <div className="space-y-1">
        <Label htmlFor={searchId} className="sr-only">
          Wyszukaj produkty
        </Label>
        <Input
          id={searchId}
          type="search"
          placeholder={INVENTORY_STRINGS.filters.searchPlaceholder}
          value={searchInput}
          onChange={handleSearchChange}
          disabled={isLoading}
          aria-invalid={searchError ? "true" : "false"}
          aria-describedby={searchError ? `${searchId}-error` : undefined}
          className="w-full"
          maxLength={SEARCH_MAX_LENGTH + 10} // Allow a bit extra to show validation
        />
        {searchError && (
          <p id={`${searchId}-error`} className="text-destructive text-sm" role="alert">
            {searchError}
          </p>
        )}
      </div>

      {/* Category and Sort Selects */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Category Filter */}
        <div className="flex-1 space-y-1">
          <Label htmlFor={categoryId} className="sr-only">
            Filtruj wg kategorii
          </Label>
          <Select value={currentCategoryValue} onValueChange={handleCategoryChange} disabled={isLoading}>
            <SelectTrigger id={categoryId} className="w-full" aria-label="Wybierz kategorię">
              <SelectValue placeholder={INVENTORY_STRINGS.filters.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{INVENTORY_STRINGS.filters.allCategories}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name_pl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Select */}
        <div className="flex-1 space-y-1">
          <Label htmlFor={sortId} className="sr-only">
            Sortuj
          </Label>
          <Select value={currentSortValue} onValueChange={handleSortChange} disabled={isLoading}>
            <SelectTrigger id={sortId} className="w-full" aria-label="Wybierz sortowanie">
              <SelectValue placeholder="Sortuj..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={`${option.sortBy}-${option.sortOrder}`} value={`${option.sortBy}-${option.sortOrder}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
