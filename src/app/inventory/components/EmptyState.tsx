"use client";

/**
 * EmptyState Component
 *
 * Friendly empty state displayed when inventory/staples list is empty.
 * Includes illustration, Polish text message, and call-to-action buttons.
 */

import { Button } from "@/components/ui/button";

import type { InventoryTab } from "../types";
import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface EmptyStateProps {
  /** Type of empty state: products, staples, or search results */
  type: InventoryTab | "search";
  /** Callback for scan receipt action */
  onScanReceipt?: () => void;
  /** Callback for quick add action */
  onQuickAdd?: () => void;
  /** Callback for initialize staples action (staples only) */
  onInitializeStaples?: () => void;
  /** Callback for clear filters action (search only) */
  onClearFilters?: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function EmptyState({ type, onScanReceipt, onQuickAdd, onInitializeStaples, onClearFilters }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case "products":
        return {
          icon: ShoppingBagIcon,
          title: INVENTORY_STRINGS.emptyState.productsTitle,
          description: INVENTORY_STRINGS.emptyState.productsDescription,
        };
      case "staples":
        return {
          icon: ChecklistIcon,
          title: INVENTORY_STRINGS.emptyState.staplesTitle,
          description: INVENTORY_STRINGS.emptyState.staplesDescription,
        };
      case "search":
        return {
          icon: SearchIcon,
          title: INVENTORY_STRINGS.emptyState.noSearchResults,
          description: INVENTORY_STRINGS.emptyState.noSearchResultsDescription,
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center" role="status" aria-live="polite">
      {/* Illustration */}
      <div className="bg-muted mb-6 rounded-full p-6">
        <Icon className="text-muted-foreground h-12 w-12" />
      </div>

      {/* Title */}
      <h2 className="text-foreground mb-2 text-xl font-semibold">{content.title}</h2>

      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-sm">{content.description}</p>

      {/* Call to Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {type === "products" && (
          <>
            {onScanReceipt && (
              <Button onClick={onScanReceipt} className="gap-2">
                <CameraIcon className="h-4 w-4" />
                {INVENTORY_STRINGS.actions.scanReceipt}
              </Button>
            )}
            {onQuickAdd && (
              <Button variant="outline" onClick={onQuickAdd} className="gap-2">
                <PlusIcon className="h-4 w-4" />
                {INVENTORY_STRINGS.actions.quickAdd}
              </Button>
            )}
          </>
        )}

        {type === "staples" && onInitializeStaples && (
          <Button onClick={onInitializeStaples} className="gap-2">
            <ChecklistIcon className="h-4 w-4" />
            {INVENTORY_STRINGS.actions.initializeStaples}
          </Button>
        )}

        {type === "search" && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {INVENTORY_STRINGS.actions.clearFilters}
          </Button>
        )}
      </div>
    </div>
  );
}
