/**
 * View Model Types for Recipes Page
 *
 * These types are specific to the Recipes page UI and extend/complement
 * the DTOs defined in src/types.ts
 */

import type { ParsedIngredientDTO, ErrorCode } from "@/types";

// =============================================================================
// Recent Recipe Types (IndexedDB)
// =============================================================================

/**
 * Stored recipe data in IndexedDB
 * Represents a parsed recipe saved locally for privacy
 */
export interface RecentRecipe {
  /** Unique identifier (UUID) */
  id: string;
  /** Recipe title extracted from page */
  title: string;
  /** Original source URL */
  source_url: string;
  /** Domain extracted from URL for display */
  source_domain: string;
  /** Parsed ingredients list */
  ingredients: ParsedIngredientDTO[];
  /** AI parsing confidence score (0-1) */
  parsing_confidence: number;
  /** Timestamp when recipe was imported */
  created_at: string;
  /** Last time recipe was viewed/used */
  last_accessed_at: string;
}

// =============================================================================
// AI Usage State Types
// =============================================================================

/**
 * State for AI usage display in recipes context
 */
export interface RecipesAIUsageState {
  substitutionsUsed: number;
  substitutionsLimit: number;
  substitutionsRemaining: number;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Recipe Parsing State Types
// =============================================================================

/**
 * State for recipe parsing operations
 */
export interface RecipeParsingState {
  isLoading: boolean;
  error: string | null;
  errorCode: ErrorCode | null;
}

// =============================================================================
// Combined Page State
// =============================================================================

/**
 * Combined page state
 */
export interface RecipesPageState {
  parsing: RecipeParsingState;
  aiUsage: RecipesAIUsageState;
  recentRecipes: RecentRecipe[];
  isLoadingRecipes: boolean;
}

// =============================================================================
// Default State Values
// =============================================================================

export const DEFAULT_AI_USAGE_STATE: RecipesAIUsageState = {
  substitutionsUsed: 0,
  substitutionsLimit: 0,
  substitutionsRemaining: 0,
  isLoading: true,
  error: null,
};

export const DEFAULT_PARSING_STATE: RecipeParsingState = {
  isLoading: false,
  error: null,
  errorCode: null,
};

// =============================================================================
// Polish UI Strings
// =============================================================================

/**
 * Polish UI strings for the recipes page
 */
export const RECIPES_STRINGS = {
  page: {
    title: "Przepisy",
  },
  urlInput: {
    label: "Link do przepisu",
    placeholder: "https://www.kwestiasmaku.com/przepis/...",
    button: "Analizuj",
    hint: "Obsługujemy popularne polskie strony z przepisami",
  },
  textInput: {
    trigger: "Wklej tekst przepisu",
    label: "Tekst przepisu",
    placeholder: "Wklej listę składników...",
    button: "Analizuj tekst",
    charCount: (current: number, max: number) => `${current}/${max} znaków`,
  },
  recentRecipes: {
    title: "Ostatnie przepisy",
    empty: {
      title: "Nie masz jeszcze żadnych przepisów",
      description: "Wklej link do przepisu powyżej, aby rozpocząć",
    },
    ingredientCount: (count: number) => `${count} składników`,
    deleteConfirm: {
      title: "Usuń przepis",
      description: "Czy na pewno chcesz usunąć ten przepis? Tej akcji nie można cofnąć.",
      confirm: "Usuń",
      cancel: "Anuluj",
    },
  },
  aiUsage: {
    remaining: (used: number, limit: number) => `Pozostało ${limit - used}/${limit} analiz`,
    warning: "Mało",
    exceeded: "Limit wyczerpany",
  },
  loading: {
    parsingUrl: "Analizuję przepis...",
    parsingText: "Analizuję tekst...",
    loadingRecipes: "Ładowanie przepisów...",
  },
  errors: {
    invalidUrl: "Wprowadź poprawny adres URL",
    httpsRequired: "Adres musi zaczynać się od https://",
    domainNotSupported: "Ta strona nie jest obsługiwana",
    fetchFailed: "Nie udało się pobrać przepisu",
    parseFailed: "Nie udało się przeanalizować przepisu",
    textTooShort: "Tekst jest zbyt krótki",
    textTooLong: "Tekst przekracza limit 10 000 znaków",
    textEmpty: "Wprowadź tekst przepisu",
    noIngredients: "Nie znaleziono składników w przepisie",
    networkError: "Brak połączenia z internetem",
    serverError: "Wystąpił błąd serwera. Spróbuj ponownie.",
    storageError: "Błąd lokalnego przechowywania danych",
  },
} as const;

// =============================================================================
// IndexedDB Configuration
// =============================================================================

/**
 * IndexedDB configuration
 */
export const RECIPES_DB_CONFIG = {
  name: "mealer-recipes",
  version: 1,
  storeName: "recipes",
  maxRecipes: 50, // LRU eviction limit
} as const;

// =============================================================================
// Validation Constants
// =============================================================================

/**
 * Text input validation constraints
 */
export const TEXT_INPUT_CONSTRAINTS = {
  minLength: 20,
  maxLength: 10000,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates URL format (client-side validation)
 */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates URL is HTTPS
 */
export function isHttpsUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("https://");
}

/**
 * Extracts domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Validates text input length
 */
export function validateTextInput(text: string): { isValid: boolean; error: string | null } {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: RECIPES_STRINGS.errors.textEmpty };
  }

  if (trimmed.length < TEXT_INPUT_CONSTRAINTS.minLength) {
    return { isValid: false, error: RECIPES_STRINGS.errors.textTooShort };
  }

  if (text.length > TEXT_INPUT_CONSTRAINTS.maxLength) {
    return { isValid: false, error: RECIPES_STRINGS.errors.textTooLong };
  }

  return { isValid: true, error: null };
}

/**
 * Formats relative time for recipe cards (Polish)
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "przed chwilą";
  }

  if (diffMinutes < 60) {
    if (diffMinutes === 1) return "minutę temu";
    if (diffMinutes < 5) return `${diffMinutes} minuty temu`;
    return `${diffMinutes} minut temu`;
  }

  if (diffHours < 24) {
    if (diffHours === 1) return "godzinę temu";
    if (diffHours < 5) return `${diffHours} godziny temu`;
    return `${diffHours} godzin temu`;
  }

  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) {
    if (diffDays < 5) return `${diffDays} dni temu`;
    return `${diffDays} dni temu`;
  }

  // Format as date for older recipes
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}
