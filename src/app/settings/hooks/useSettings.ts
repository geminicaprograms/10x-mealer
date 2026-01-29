"use client";

/**
 * useSettings Hook
 *
 * Custom hook that encapsulates all settings page state and logic.
 * Provides data fetching, state management, and action handlers.
 *
 * Now integrates with ProfileContext and AIUsageContext for centralized
 * state management and reduced API calls.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ProfileDTO, ProfileUpdateCommand, AIUsageDTO, SystemConfigDTO, DeleteAccountCommand } from "@/types";
import { settingsApi, SettingsApiError } from "@/lib/services/settings-api";
import { createClient } from "@/db/supabase/client";
import { useProfile, useAIUsage, useAuth } from "@/contexts";

import type { SettingsLoadingState, SettingsErrorState } from "../types";
import { DEFAULT_LOADING_STATE, DEFAULT_ERROR_STATE, SETTINGS_STRINGS } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useSettings hook
 */
export interface UseSettingsReturn {
  // Data
  profile: ProfileDTO | null;
  aiUsage: AIUsageDTO | null;
  config: SystemConfigDTO | null;

  // Loading states
  isLoading: boolean;
  isLoadingProfile: boolean;
  isLoadingAIUsage: boolean;
  isLoadingConfig: boolean;
  isSavingPreferences: boolean;
  isLoggingOut: boolean;
  isDeletingAccount: boolean;

  // Error states
  errors: SettingsErrorState;

  // Edit sheet state
  isEditSheetOpen: boolean;
  openEditSheet: () => void;
  closeEditSheet: () => void;

  // Dialog states
  isLogoutDialogOpen: boolean;
  openLogoutDialog: () => void;
  closeLogoutDialog: () => void;
  isDeleteModalOpen: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;

  // Actions
  savePreferences: (data: ProfileUpdateCommand) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (data: DeleteAccountCommand) => Promise<void>;
  retryFetch: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSettings(): UseSettingsReturn {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Context Integration
  // ---------------------------------------------------------------------------

  // Use centralized contexts for profile and AI usage
  const {
    profile: contextProfile,
    isLoading: isContextProfileLoading,
    error: contextProfileError,
    updateProfile: contextUpdateProfile,
    refetch: refetchProfile,
  } = useProfile();

  const {
    usage: contextAIUsage,
    isLoading: isContextAIUsageLoading,
    error: contextAIUsageError,
    refetch: refetchAIUsage,
  } = useAIUsage();

  const { signOut } = useAuth();

  // ---------------------------------------------------------------------------
  // Local State (for config and UI state)
  // ---------------------------------------------------------------------------

  const [config, setConfig] = useState<SystemConfigDTO | null>(null);
  const [loadingState, setLoadingState] = useState<SettingsLoadingState>({
    ...DEFAULT_LOADING_STATE,
    // Profile and AI usage loading comes from context
    profile: false,
    aiUsage: false,
  });
  const [errors, setErrors] = useState<SettingsErrorState>(DEFAULT_ERROR_STATE);

  // Modal/Sheet states
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived State from Contexts
  // ---------------------------------------------------------------------------

  // Use profile from context
  const profile = contextProfile;
  const aiUsage = contextAIUsage;

  // Merge context errors with local errors
  const mergedErrors = useMemo<SettingsErrorState>(
    () => ({
      ...errors,
      profile: contextProfileError?.message ?? errors.profile,
      aiUsage: contextAIUsageError?.message ?? errors.aiUsage,
    }),
    [errors, contextProfileError, contextAIUsageError]
  );

  // ---------------------------------------------------------------------------
  // Loading Helpers
  // ---------------------------------------------------------------------------

  const setPartialLoading = useCallback((updates: Partial<SettingsLoadingState>) => {
    setLoadingState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setPartialError = useCallback((updates: Partial<SettingsErrorState>) => {
    setErrors((prev) => ({ ...prev, ...updates }));
  }, []);

  // ---------------------------------------------------------------------------
  // Data Fetching (only config now - profile/aiUsage come from context)
  // ---------------------------------------------------------------------------

  const fetchConfig = useCallback(async () => {
    setPartialLoading({ config: true });
    setPartialError({ config: null });

    try {
      const data = await settingsApi.getConfig();
      setConfig(data);
    } catch (error) {
      const message = error instanceof SettingsApiError ? error.message : SETTINGS_STRINGS.errors.generic;
      setPartialError({ config: message });

      // Handle 401 - redirect to login
      if (error instanceof SettingsApiError && error.status === 401) {
        toast.error(SETTINGS_STRINGS.errors.sessionExpired);
        router.push("/login");
      }
    } finally {
      setPartialLoading({ config: false });
    }
  }, [router, setPartialError, setPartialLoading]);

  const fetchAllData = useCallback(() => {
    // Profile and AI usage are fetched by contexts automatically
    // Only need to fetch config locally
    fetchConfig();
    // Trigger context refetches to ensure fresh data
    refetchProfile();
    refetchAIUsage();
  }, [fetchConfig, refetchProfile, refetchAIUsage]);

  // Initial config load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ---------------------------------------------------------------------------
  // Sheet/Dialog State Management
  // ---------------------------------------------------------------------------

  const openEditSheet = useCallback(() => {
    setIsEditSheetOpen(true);
  }, []);

  const closeEditSheet = useCallback(() => {
    setIsEditSheetOpen(false);
  }, []);

  const openLogoutDialog = useCallback(() => {
    setIsLogoutDialogOpen(true);
  }, []);

  const closeLogoutDialog = useCallback(() => {
    setIsLogoutDialogOpen(false);
  }, []);

  const openDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const savePreferences = useCallback(
    async (data: ProfileUpdateCommand) => {
      setPartialLoading({ saving: true });
      setPartialError({ save: null });

      try {
        // Use context's updateProfile for centralized state management
        await contextUpdateProfile(data);
        setIsEditSheetOpen(false);
        toast.success(SETTINGS_STRINGS.preferencesEdit.success);
      } catch (error) {
        const message = error instanceof Error ? error.message : SETTINGS_STRINGS.errors.generic;
        setPartialError({ save: message });
        toast.error(message);
      } finally {
        setPartialLoading({ saving: false });
      }
    },
    [contextUpdateProfile, setPartialError, setPartialLoading]
  );

  const logout = useCallback(async () => {
    setPartialLoading({ loggingOut: true });

    try {
      // Use context's signOut for centralized auth management
      await signOut();

      // Clear any local storage if needed
      if (typeof window !== "undefined") {
        localStorage.removeItem("mealer-recent-recipes");
      }

      // Close dialog and redirect
      setIsLogoutDialogOpen(false);
      router.push("/login");
    } catch {
      toast.error(SETTINGS_STRINGS.errors.generic);
    } finally {
      setPartialLoading({ loggingOut: false });
    }
  }, [router, setPartialLoading, signOut]);

  const deleteAccount = useCallback(
    async (data: DeleteAccountCommand) => {
      setPartialLoading({ deletingAccount: true });

      try {
        await settingsApi.deleteAccount(data);

        // Sign out after successful deletion
        const supabase = createClient();
        await supabase.auth.signOut();

        // Clear local storage
        if (typeof window !== "undefined") {
          localStorage.removeItem("mealer-recent-recipes");
        }

        // Close modal and redirect
        setIsDeleteModalOpen(false);
        router.push("/login");
      } catch (error) {
        // Error handling is done inside DeleteAccountModal
        // We just re-throw for the modal to handle
        throw error;
      } finally {
        setPartialLoading({ deletingAccount: false });
      }
    },
    [router, setPartialLoading]
  );

  const retryFetch = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  // Combine context loading states with local loading states
  const isLoading = isContextProfileLoading || isContextAIUsageLoading || loadingState.config;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data
    profile,
    aiUsage,
    config,

    // Loading states
    isLoading,
    isLoadingProfile: isContextProfileLoading,
    isLoadingAIUsage: isContextAIUsageLoading,
    isLoadingConfig: loadingState.config,
    isSavingPreferences: loadingState.saving,
    isLoggingOut: loadingState.loggingOut,
    isDeletingAccount: loadingState.deletingAccount,

    // Error states (use merged errors)
    errors: mergedErrors,

    // Edit sheet state
    isEditSheetOpen,
    openEditSheet,
    closeEditSheet,

    // Dialog states
    isLogoutDialogOpen,
    openLogoutDialog,
    closeLogoutDialog,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,

    // Actions
    savePreferences,
    logout,
    deleteAccount,
    retryFetch,
  };
}
