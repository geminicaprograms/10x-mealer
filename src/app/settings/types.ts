/**
 * Type definitions for the Settings Page view
 *
 * These types are specific to the settings page and define
 * view models, form data structures, and state types.
 */

import type { ProfileDTO, AIUsageDTO, SystemConfigDTO } from "@/types";

// =============================================================================
// View Model Types
// =============================================================================

/**
 * Combined view model for the settings page containing all required data
 */
export interface SettingsViewModel {
  profile: ProfileDTO | null;
  aiUsage: AIUsageDTO | null;
  config: SystemConfigDTO | null;
}

/**
 * Form data for preferences editing
 */
export interface PreferencesFormData {
  allergies: string[];
  diets: string[];
  equipment: string[];
  hasNoAllergies: boolean;
  hasNoDiets: boolean;
}

/**
 * Settings page loading states
 */
export interface SettingsLoadingState {
  profile: boolean;
  aiUsage: boolean;
  config: boolean;
  saving: boolean;
  loggingOut: boolean;
  deletingAccount: boolean;
}

/**
 * Settings page error states
 */
export interface SettingsErrorState {
  profile: string | null;
  aiUsage: string | null;
  config: string | null;
  save: string | null;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for PreferencesSection component
 */
export interface PreferencesSectionProps {
  profile: ProfileDTO;
  onEditClick: () => void;
}

/**
 * Props for PreferencesEditSheet component
 */
export interface PreferencesEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileDTO;
  config: SystemConfigDTO;
  onSave: (data: import("@/types").ProfileUpdateCommand) => Promise<void>;
  isSaving: boolean;
}

/**
 * Props for AIUsageSection component
 */
export interface AIUsageSectionProps {
  usage: AIUsageDTO | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Props for AccountSection component
 */
export interface AccountSectionProps {
  onLogout: () => Promise<void>;
  onDeleteAccount: (data: import("@/types").DeleteAccountCommand) => Promise<void>;
  isLoggingOut: boolean;
  isDeletingAccount: boolean;
}

/**
 * Props for LogoutConfirmDialog component
 */
export interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default loading state for settings page
 */
export const DEFAULT_LOADING_STATE: SettingsLoadingState = {
  profile: true,
  aiUsage: true,
  config: true,
  saving: false,
  loggingOut: false,
  deletingAccount: false,
};

/**
 * Default error state for settings page
 */
export const DEFAULT_ERROR_STATE: SettingsErrorState = {
  profile: null,
  aiUsage: null,
  config: null,
  save: null,
};

/**
 * Polish strings for the settings page
 */
export const SETTINGS_STRINGS = {
  page: {
    title: "Ustawienia",
  },
  preferences: {
    title: "Preferencje",
    editButton: "Edytuj",
    allergies: "Alergie",
    diets: "Diety",
    equipment: "Sprzęt kuchenny",
    empty: "Brak",
    noAllergies: "Brak alergii",
    noDiets: "Brak diety",
  },
  preferencesEdit: {
    title: "Edytuj preferencje",
    cancel: "Anuluj",
    save: "Zapisz",
    saving: "Zapisywanie...",
    success: "Preferencje zostały zapisane",
    error: "Nie udało się zapisać preferencji",
  },
  staples: {
    title: "Podstawowe produkty",
    description: "Zarządzaj podstawowymi produktami w swojej spiżarni",
    linkText: "Przejdź do podstawowych produktów",
  },
  aiUsage: {
    title: "Użycie AI",
    date: "Dzisiaj",
    scans: "Skanowania",
    substitutions: "Zamienniki",
    remaining: "pozostało",
    resetInfo: "Limity resetują się codziennie o północy",
    loadError: "Nie udało się załadować",
    retry: "Spróbuj ponownie",
  },
  account: {
    title: "Konto",
    logout: "Wyloguj",
    deleteAccount: "Usuń konto",
  },
  logoutDialog: {
    title: "Wylogowanie",
    description: "Czy na pewno chcesz się wylogować?",
    cancel: "Anuluj",
    confirm: "Wyloguj",
    confirming: "Wylogowywanie...",
  },
  errors: {
    noNetwork: "Brak połączenia z internetem",
    timeout: "Przekroczono czas oczekiwania",
    sessionExpired: "Sesja wygasła",
    generic: "Wystąpił błąd. Spróbuj ponownie.",
  },
} as const;
