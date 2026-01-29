"use client";

/**
 * BottomNavigation Component
 *
 * Mobile-friendly bottom navigation bar for switching between main app sections.
 * Highlights the currently active route.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Match pattern - route is active if pathname starts with this */
  matchPrefix: string;
}

// =============================================================================
// Icons
// =============================================================================

function InventoryIcon({ className }: { className?: string }) {
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
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function RecipesIcon({ className }: { className?: string }) {
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
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

// =============================================================================
// Navigation Items
// =============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    href: "/inventory",
    label: "Spiżarnia",
    icon: InventoryIcon,
    matchPrefix: "/inventory",
  },
  {
    href: "/recipes",
    label: "Przepisy",
    icon: RecipesIcon,
    matchPrefix: "/recipes",
  },
];

// =============================================================================
// Component
// =============================================================================

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background fixed right-0 bottom-0 left-0 z-50 border-t"
      role="navigation"
      aria-label="Główna nawigacja"
    >
      <div className="container mx-auto flex h-16 items-center justify-around px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
