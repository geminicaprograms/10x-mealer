"use client";

/**
 * ProductAutocomplete Component
 *
 * Autocomplete input for selecting products from the catalog.
 * Features debounced search, keyboard navigation, and free-text fallback.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import { productsApi } from "@/lib/services/inventory-api";
import type { ProductDTO, UnitBriefDTO } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface ProductAutocompleteProps {
  /** Currently selected product ID */
  selectedProductId: number | null;
  /** Current custom name (when not selecting from catalog) */
  customName: string;
  /** Callback when a product is selected from catalog */
  onProductSelect: (product: ProductDTO) => void;
  /** Callback when custom name is entered (clears product selection) */
  onCustomNameChange: (name: string) => void;
  /** Callback when default unit should be set (from selected product) */
  onDefaultUnitSelect?: (unit: UnitBriefDTO) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Error state */
  hasError?: boolean;
  /** ID for accessibility */
  id?: string;
  /** aria-describedby for accessibility */
  "aria-describedby"?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 10;

// =============================================================================
// Hook for debounced search
// =============================================================================

function useProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear results if query is too short
    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Debounce the search
    const timeoutId = setTimeout(async () => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const products = await productsApi.search({
          query,
          limit: SEARCH_LIMIT,
        });
        setResults(products);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Product search error:", err);
        setError("Nie udało się wyszukać produktów");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { query, setQuery, results, isLoading, error };
}

// =============================================================================
// Component
// =============================================================================

export function ProductAutocomplete({
  selectedProductId,
  customName,
  onProductSelect,
  onCustomNameChange,
  onDefaultUnitSelect,
  disabled = false,
  placeholder = "Wybierz lub wpisz nazwę...",
  hasError = false,
  id,
  "aria-describedby": ariaDescribedBy,
}: ProductAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const { query, setQuery, results, isLoading, error } = useProductSearch();

  // Update selected product display when ID changes
  useEffect(() => {
    if (selectedProductId === null) {
      setSelectedProduct(null);
    }
  }, [selectedProductId]);

  // Display text for the trigger button
  const displayValue = selectedProduct?.name_pl || customName || "";

  const handleSelect = useCallback(
    (product: ProductDTO) => {
      setSelectedProduct(product);
      onProductSelect(product);

      // Auto-select default unit if available
      if (product.default_unit && onDefaultUnitSelect) {
        onDefaultUnitSelect(product.default_unit);
      }

      setOpen(false);
      setQuery("");
    },
    [onProductSelect, onDefaultUnitSelect, setQuery]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      // If user is typing, clear the product selection and use custom name
      if (selectedProduct) {
        setSelectedProduct(null);
      }
      onCustomNameChange(value);
    },
    [selectedProduct, onCustomNameChange, setQuery]
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        // Pre-populate with current custom name when opening
        setQuery(customName);
      }
    },
    [customName, setQuery]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-describedby={ariaDescribedBy}
          aria-invalid={hasError}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground",
            hasError && "border-destructive"
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Wpisz nazwę produktu..." value={query} onValueChange={handleInputChange} />
          <CommandList>
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Szukam...</span>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && <div className="text-destructive py-6 text-center text-sm">{error}</div>}

            {/* No results */}
            {!isLoading && !error && query.length >= MIN_QUERY_LENGTH && results.length === 0 && (
              <CommandEmpty>
                <div className="space-y-2">
                  <p>Nie znaleziono produktu</p>
                  <p className="text-muted-foreground text-xs">Użyj wpisanej nazwy: &quot;{query}&quot;</p>
                </div>
              </CommandEmpty>
            )}

            {/* Hint to type more */}
            {!isLoading && query.length > 0 && query.length < MIN_QUERY_LENGTH && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                Wpisz co najmniej {MIN_QUERY_LENGTH} znaki...
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && results.length > 0 && (
              <CommandGroup heading="Produkty z katalogu">
                {results.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={String(product.id)}
                    onSelect={() => handleSelect(product)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedProductId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{product.name_pl}</span>
                    </div>
                    {product.category && (
                      <Badge variant="secondary" className="ml-2 shrink-0">
                        {product.category.name_pl}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Custom name option when there are results but user might want custom */}
            {!isLoading && query.length >= MIN_QUERY_LENGTH && results.length > 0 && (
              <CommandGroup heading="Lub użyj własnej nazwy">
                <CommandItem
                  value={`custom-${query}`}
                  onSelect={() => {
                    setSelectedProduct(null);
                    onCustomNameChange(query);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <span className="truncate">Użyj: &quot;{query}&quot;</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
