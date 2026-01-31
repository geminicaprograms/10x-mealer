"use client";

import * as React from "react";
import { useState, useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/utils/accessibility";

/** Delay before hiding the indicator after connection is restored (ms) */
const HIDE_DELAY_MS = 2000;

/**
 * Subscribe to online/offline events
 */
function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Get current online status snapshot (client-only, no SSR check needed)
 */
function getOnlineStatusSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Client-only component that handles the actual indicator logic.
 * This component is dynamically imported with ssr: false.
 */
function OfflineIndicatorClient() {
  const isOnline = useSyncExternalStore(subscribeToOnlineStatus, getOnlineStatusSnapshot);
  const [isVisible, setIsVisible] = useState(!navigator.onLine);
  const [isHiding, setIsHiding] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [wasOnline, setWasOnline] = useState(navigator.onLine);

  // Handle visibility changes based on online status transitions
  if (isOnline !== wasOnline) {
    if (isOnline) {
      setIsHiding(true);
    } else {
      setIsVisible(true);
      setIsHiding(false);
    }
    setWasOnline(isOnline);
  }

  // Handle delayed hiding when coming back online
  useEffect(() => {
    if (!isHiding) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsHiding(false);
    }, HIDE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isHiding]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn("fixed top-0 right-0 left-0 z-50", "pt-[env(safe-area-inset-top,0px)]")}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2",
          isOnline ? "bg-green-600 text-white" : "bg-amber-600 text-white",
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

/**
 * OfflineIndicator component that displays a banner when the user loses internet connection.
 * Automatically shows/hides based on connection status.
 * Positioned at the top of the screen below safe-area for notched devices.
 *
 * Uses dynamic import with ssr: false to avoid hydration mismatches
 * since the online status is only available on the client.
 */
export const OfflineIndicator = dynamic(() => Promise.resolve(OfflineIndicatorClient), {
  ssr: false,
});
