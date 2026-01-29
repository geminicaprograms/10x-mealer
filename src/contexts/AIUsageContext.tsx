"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { AIUsageDTO } from "@/types";
import type { AIUsageContextValue } from "./types";
import { useAuth } from "./AuthContext";

const AIUsageContext = createContext<AIUsageContextValue | undefined>(undefined);

interface AIUsageProviderProps {
  children: React.ReactNode;
}

/**
 * AIUsageProvider component that manages AI usage limits and quota.
 * Depends on AuthContext for user authentication state.
 * Automatically fetches usage data when user authenticates.
 */
export function AIUsageProvider({ children }: AIUsageProviderProps) {
  const { user, isAuthenticated, setSessionExpired } = useAuth();
  const [usage, setUsage] = useState<AIUsageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) {
      setUsage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/usage");

      if (response.status === 401) {
        setSessionExpired();
        setUsage(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch AI usage");
      }

      const data: AIUsageDTO = await response.json();
      setUsage(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch AI usage");
      setError(error);
      console.error("Error fetching AI usage:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setSessionExpired]);

  // Fetch usage when user changes
  useEffect(() => {
    if (user) {
      fetchUsage();
    } else {
      setUsage(null);
      setError(null);
    }
  }, [user, fetchUsage]);

  const refetch = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  // Computed properties for checking quota
  const canScan = useMemo(() => {
    return usage ? usage.receipt_scans.remaining > 0 : false;
  }, [usage]);

  const canGetSubstitutions = useMemo(() => {
    return usage ? usage.substitutions.remaining > 0 : false;
  }, [usage]);

  const value = useMemo<AIUsageContextValue>(
    () => ({
      usage,
      isLoading,
      error,
      canScan,
      canGetSubstitutions,
      refetch,
    }),
    [usage, isLoading, error, canScan, canGetSubstitutions, refetch]
  );

  return <AIUsageContext.Provider value={value}>{children}</AIUsageContext.Provider>;
}

/**
 * Hook to access the AI usage context.
 * Must be used within an AIUsageProvider (and AuthProvider).
 *
 * @returns AIUsageContextValue with usage state and methods
 * @throws Error if used outside of AIUsageProvider
 */
export function useAIUsage(): AIUsageContextValue {
  const context = useContext(AIUsageContext);

  if (context === undefined) {
    throw new Error("useAIUsage must be used within an AIUsageProvider");
  }

  return context;
}
