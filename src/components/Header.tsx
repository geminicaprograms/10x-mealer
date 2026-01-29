"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  /** Page title to display (defaults to "Mealer" logo text) */
  title?: string;
  /** Show back navigation button */
  showBack?: boolean;
  /** Custom back navigation target (uses router.back() if not provided) */
  backHref?: string;
  /** Show settings icon link (defaults to true) */
  showSettings?: boolean;
  /** Additional CSS classes for customization */
  className?: string;
}

/**
 * Shared header component for main application pages.
 * Provides consistent navigation with optional back button, title, and settings link.
 * Includes PWA-optimized safe area padding for notched devices.
 */
export function Header({ title, showBack = false, backHref, showSettings = true, className }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-sm",
        // PWA safe area support for notched devices
        "pt-[env(safe-area-inset-top,0px)]",
        className
      )}
    >
      <div className="flex h-14 items-center px-4 sm:h-16">
        {/* Left section - Back button or spacer */}
        <div className="flex w-12 items-center justify-start">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label="Wróć do poprzedniej strony"
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        {/* Center section - Title */}
        <div className="flex flex-1 items-center justify-center">
          {title ? (
            <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
          ) : (
            <Link
              href="/inventory"
              className="text-primary text-xl font-bold tracking-tight transition-opacity hover:opacity-80 sm:text-2xl"
              aria-label="Mealer - Strona główna"
            >
              Mealer
            </Link>
          )}
        </div>

        {/* Right section - Settings icon or spacer */}
        <div className="flex w-12 items-center justify-end">
          {showSettings ? (
            <Button variant="ghost" size="icon" asChild className="h-10 w-10" aria-label="Ustawienia">
              <Link href="/settings">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
