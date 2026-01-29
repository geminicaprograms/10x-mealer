"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect user's prefers-reduced-motion preference.
 * Returns true if user prefers reduced motion, false otherwise.
 * Automatically updates when the preference changes.
 *
 * @returns boolean indicating if reduced motion is preferred
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 */
export function usePrefersReducedMotion(): boolean {
  // Default to false to avoid hydration mismatch
  // (server doesn't know user preference)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is available (client-side only)
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Check if user prefers reduced motion (non-reactive, for one-time checks).
 * Use usePrefersReducedMotion hook for reactive updates.
 *
 * @returns boolean indicating if reduced motion is preferred, or false if not detectable
 */
export function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get appropriate animation duration based on user's motion preference.
 * Returns 0 if user prefers reduced motion, otherwise returns the provided duration.
 *
 * @param duration - Animation duration in milliseconds
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Adjusted duration (0 if reduced motion preferred)
 */
export function getAnimationDuration(duration: number, prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : duration;
}

/**
 * CSS class helper for conditional animations.
 * Returns empty string if user prefers reduced motion, otherwise returns the animation class.
 *
 * @param animationClass - CSS class name for animation
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Animation class or empty string
 */
export function getAnimationClass(animationClass: string, prefersReducedMotion: boolean): string {
  return prefersReducedMotion ? "" : animationClass;
}
