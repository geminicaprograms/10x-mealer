"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ProfileDTO, ProfileUpdateCommand } from "@/types";
import type { ProfileContextValue } from "./types";
import { useAuth } from "./AuthContext";

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
}

/**
 * ProfileProvider component that manages user profile state.
 * Depends on AuthContext for user authentication state.
 * Automatically fetches profile when user authenticates.
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const { user, isAuthenticated, setSessionExpired } = useAuth();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile");

      if (response.status === 401) {
        setSessionExpired();
        setProfile(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch profile");
      }

      const data: ProfileDTO = await response.json();
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch profile");
      setError(error);
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setSessionExpired]);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback(
    async (data: ProfileUpdateCommand) => {
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      // Store previous profile for rollback on error
      const previousProfile = profile;

      // Optimistic update
      if (profile) {
        setProfile({
          ...profile,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.status === 401) {
          setSessionExpired();
          // Rollback optimistic update
          setProfile(previousProfile);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Failed to update profile");
        }

        const updatedProfile: ProfileDTO = await response.json();
        setProfile(updatedProfile);
      } catch (err) {
        // Rollback optimistic update
        setProfile(previousProfile);

        const error = err instanceof Error ? err : new Error("Failed to update profile");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, profile, setSessionExpired]
  );

  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const isOnboardingCompleted = useMemo(() => {
    return profile?.onboarding_status === "completed";
  }, [profile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      error,
      isOnboardingCompleted,
      updateProfile,
      refetch,
    }),
    [profile, isLoading, error, isOnboardingCompleted, updateProfile, refetch]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Hook to access the profile context.
 * Must be used within a ProfileProvider (and AuthProvider).
 *
 * @returns ProfileContextValue with profile state and methods
 * @throws Error if used outside of ProfileProvider
 */
export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);

  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}
