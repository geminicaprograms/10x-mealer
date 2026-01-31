"use client";

/**
 * SettingsContainer Component
 *
 * Main client component that orchestrates data fetching, state management,
 * and renders all settings sections. Acts as the data layer for child components.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import { useSettings } from "../hooks";
import { SETTINGS_STRINGS } from "../types";

import { PreferencesSection } from "./PreferencesSection";
import { PreferencesEditSheet } from "./PreferencesEditSheet";
import { StaplesSection } from "./StaplesSection";
import { AIUsageSection } from "./AIUsageSection";
import { AccountSection } from "./AccountSection";

// =============================================================================
// Sub-components
// =============================================================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-muted-foreground text-center">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        {SETTINGS_STRINGS.aiUsage.retry}
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SettingsContainer() {
  const {
    // Data
    profile,
    aiUsage,
    config,

    // Loading states
    isLoadingProfile,
    isLoadingAIUsage,
    isSavingPreferences,
    isLoggingOut,
    isDeletingAccount,

    // Error states
    errors,

    // Edit sheet state
    isEditSheetOpen,
    openEditSheet,
    closeEditSheet,

    // Actions
    savePreferences,
    logout,
    deleteAccount,
    retryFetch,
  } = useSettings();

  // Check for critical errors (profile or config failed)
  const hasCriticalError = errors.profile && errors.config;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (hasCriticalError) {
    return <ErrorState message={SETTINGS_STRINGS.errors.generic} onRetry={retryFetch} />;
  }

  return (
    <div className="space-y-4">
      {/* Preferences Section */}
      <PreferencesSection
        profile={profile}
        isLoading={isLoadingProfile}
        isConfigLoaded={config !== null}
        onEditClick={openEditSheet}
      />

      {/* Preferences Edit Sheet */}
      {profile && config && (
        <PreferencesEditSheet
          isOpen={isEditSheetOpen}
          onClose={closeEditSheet}
          profile={profile}
          config={config}
          onSave={savePreferences}
          isSaving={isSavingPreferences}
        />
      )}

      {/* Staples Section */}
      <StaplesSection />

      {/* AI Usage Section */}
      <AIUsageSection usage={aiUsage} isLoading={isLoadingAIUsage} error={errors.aiUsage} onRetry={retryFetch} />

      {/* Account Section */}
      <AccountSection
        onLogout={logout}
        onDeleteAccount={deleteAccount}
        isLoggingOut={isLoggingOut}
        isDeletingAccount={isDeletingAccount}
      />
    </div>
  );
}
