"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/utils/accessibility";

/** Delay before hiding the indicator after connection is restored (ms) */
const HIDE_DELAY_MS = 2000;

/**
 * OfflineIndicator component that displays a banner when the user loses internet connection.
 * Automatically shows/hides based on connection status.
 * Positioned at the top of the screen below safe-area for notched devices.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Start hiding animation with delay
    setIsHiding(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsHiding(false);
    }, HIDE_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsVisible(true);
    setIsHiding(false);
  }, []);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Set initial state
    const online = navigator.onLine;
    setIsOnline(online);
    setIsVisible(!online);

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Don't render anything if online and not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "fixed top-0 right-0 left-0 z-50",
        // Safe area padding for notched devices
        "pt-[env(safe-area-inset-top,0px)]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2",
          // Colors based on online/offline state
          isOnline ? "bg-green-600 text-white" : "bg-amber-600 text-white",
          // Animation classes (respects reduced motion via CSS)
          !prefersReducedMotion && "transition-all duration-300 ease-in-out",
          isHiding && !prefersReducedMotion && "animate-pulse"
        )}
      >
        <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">
          {isOnline ? "Połączenie przywrócone" : "Brak połączenia z internetem"}
        </span>
      </div>
    </div>
  );
}
