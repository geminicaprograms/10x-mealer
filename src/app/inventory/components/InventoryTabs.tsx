"use client";

/**
 * InventoryTabs Component
 *
 * Tab navigation for switching between Products and Staples views.
 * Uses Shadcn Tabs component with count badges.
 */

import { useId } from "react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import type { InventoryTab } from "../types";
import { INVENTORY_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

interface InventoryTabsProps {
  /** Currently active tab */
  activeTab: InventoryTab;
  /** Callback when tab changes */
  onTabChange: (tab: InventoryTab) => void;
  /** Number of products */
  productsCount: number;
  /** Number of staples */
  staplesCount: number;
  /** Products tab content */
  productsContent: React.ReactNode;
  /** Staples tab content */
  staplesContent: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function InventoryTabs({
  activeTab,
  onTabChange,
  productsCount,
  staplesCount,
  productsContent,
  staplesContent,
}: InventoryTabsProps) {
  const tabsId = useId();

  const handleTabChange = (value: string) => {
    if (value === "products" || value === "staples") {
      onTabChange(value);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" aria-label="Widok inwentarza">
      <TabsList className="mb-4 grid w-full grid-cols-2" aria-label="Wybierz typ produktów">
        <TabsTrigger
          value="products"
          id={`${tabsId}-products-tab`}
          aria-controls={`${tabsId}-products-panel`}
          className="flex items-center gap-2"
        >
          <span>{INVENTORY_STRINGS.tabs.products}</span>
          {productsCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[1.5rem] text-xs" aria-label={`${productsCount} produktów`}>
              {productsCount}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger
          value="staples"
          id={`${tabsId}-staples-tab`}
          aria-controls={`${tabsId}-staples-panel`}
          className="flex items-center gap-2"
        >
          <span>{INVENTORY_STRINGS.tabs.staples}</span>
          {staplesCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-[1.5rem] text-xs"
              aria-label={`${staplesCount} podstawowych produktów`}
            >
              {staplesCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="products"
        id={`${tabsId}-products-panel`}
        aria-labelledby={`${tabsId}-products-tab`}
        role="tabpanel"
        tabIndex={0}
        className="focus-visible:ring-ring mt-0 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {productsContent}
      </TabsContent>

      <TabsContent
        value="staples"
        id={`${tabsId}-staples-panel`}
        aria-labelledby={`${tabsId}-staples-tab`}
        role="tabpanel"
        tabIndex={0}
        className="focus-visible:ring-ring mt-0 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {staplesContent}
      </TabsContent>
    </Tabs>
  );
}
