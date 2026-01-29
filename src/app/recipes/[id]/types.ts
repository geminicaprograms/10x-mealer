/**
 * View Model Types for Recipe Detail Page
 *
 * These types are specific to the Recipe Detail page UI and extend/complement
 * the DTOs defined in src/types.ts
 */

import type {
  IngredientStatus,
  SubstitutionSuggestionDTO,
  MatchedInventoryItemDTO,
  SubstitutionWarningDTO,
  SubstitutionsResponseDTO,
  ParsedIngredientDTO,
} from "@/types";
import type { RecentRecipe } from "../types";

// =============================================================================
// Ingredient Analysis View Models
// =============================================================================

/**
 * Extended ingredient analysis for UI display
 * Combines API response with original recipe ingredient data
 */
export interface IngredientAnalysisViewModel {
  /** Original ingredient name from recipe */
  name: string;
  /** Original quantity from recipe */
  quantity: number | null;
  /** Original unit from recipe */
  unit: string | null;
  /** Status determined by AI analysis */
  status: IngredientStatus;
  /** Matched inventory item (if available or partial) */
  matchedItem: MatchedInventoryItemDTO | null;
  /** AI substitution suggestion (if missing with substitute) */
  substitution: SubstitutionSuggestionDTO | null;
  /** Per-ingredient allergy warning */
  allergyWarning: string | null;
  /** Whether this ingredient is a staple (no quantity tracking) */
  isStaple: boolean;
}

// =============================================================================
// Substitution Analysis State
// =============================================================================

/**
 * Complete substitution analysis state for the page
 */
export interface SubstitutionAnalysisViewModel {
  /** Analyzed ingredients with status and suggestions */
  ingredients: IngredientAnalysisViewModel[];
  /** Global warnings (allergies, diets, equipment) */
  warnings: SubstitutionWarningDTO[];
  /** AI usage after this analysis */
  usage: {
    substitutionsUsedToday: number;
    substitutionsRemaining: number;
  };
  /** Timestamp of analysis */
  analyzedAt: string;
}

// =============================================================================
// Deduction Dialog Types
// =============================================================================

/**
 * Item in the deduction confirmation dialog
 */
export interface DeductionItemViewModel {
  /** Inventory item ID (for API call) */
  inventoryItemId: string;
  /** Display name (from inventory or recipe) */
  name: string;
  /** Suggested deduction quantity (from recipe) */
  suggestedQuantity: number;
  /** Current quantity in inventory */
  currentInventoryQuantity: number;
  /** Unit abbreviation for display */
  unit: string;
  /** User-adjusted deduction quantity */
  adjustedQuantity: number;
}

// =============================================================================
// Page State Types
// =============================================================================

/**
 * Cooked This dialog state
 */
export interface CookedThisDialogState {
  isOpen: boolean;
  isSubmitting: boolean;
  deductionItems: DeductionItemViewModel[];
  error: string | null;
}

/**
 * Complete page state for Recipe Detail
 */
export interface RecipeDetailPageState {
  /** Recipe data from IndexedDB */
  recipe: RecentRecipe | null;
  /** Whether recipe is loading from IndexedDB */
  isLoadingRecipe: boolean;
  /** Recipe load error */
  recipeError: string | null;

  /** Substitution analysis result */
  analysis: SubstitutionAnalysisViewModel | null;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Analysis error message */
  analysisError: string | null;
  /** Analysis error code for specific handling */
  analysisErrorCode: string | null;

  /** Whether user inventory is empty */
  isEmptyInventory: boolean;
  /** Whether user can use AI features (onboarding complete, not rate limited) */
  canUseAI: boolean;

  /** Indices of expanded substitution sections */
  expandedSubstitutions: Set<number>;

  /** Cooked This dialog state */
  cookedThisDialog: CookedThisDialogState;
}

// =============================================================================
// Polish UI Strings
// =============================================================================

export const RECIPE_DETAIL_STRINGS = {
  page: {
    title: "Przepis",
    backLabel: "Powrót do przepisów",
  },
  header: {
    sourceLabel: "Źródło:",
    openInNewTab: "Otwórz w nowej karcie",
  },
  analysis: {
    sectionTitle: "Analiza składników",
    loading: "Analizuję składniki...",
    retryButton: "Spróbuj ponownie",
  },
  ingredients: {
    listTitle: "Składniki",
    statusLabels: {
      available: "Dostępny",
      partial: "Częściowo",
      missing: "Brak",
      substitution: "Zamiennik",
    },
    showSubstitution: "Pokaż zamiennik",
    hideSubstitution: "Ukryj zamiennik",
    noQuantity: "bez ilości",
  },
  warnings: {
    allergyTitle: "Ostrzeżenie - Alergia",
    dietTitle: "Ostrzeżenie - Dieta",
    equipmentTitle: "Brak sprzętu",
  },
  emptyInventory: {
    title: "Brak produktów w spiżarni",
    description: "Dodaj produkty do spiżarni, aby zobaczyć analizę składników i propozycje zamienników.",
    actionButton: "Dodaj produkty",
  },
  cookedThis: {
    button: "Ugotowałem to",
    dialogTitle: "Potwierdź zużycie składników",
    dialogDescription: "Sprawdź i dostosuj ilości zużytych składników:",
    currentInventory: "W spiżarni:",
    confirmButton: "Potwierdź",
    cancelButton: "Anuluj",
    successToast: "Zaktualizowano spiżarnię",
    errorToast: "Nie udało się zaktualizować spiżarni",
    warningExceedsInventory: "Ilość przekracza stan magazynowy",
  },
  rateLimited: {
    title: "Osiągnięto limit",
    description: "Dzienny limit analiz AI został wyczerpany. Spróbuj ponownie jutro.",
  },
  errors: {
    recipeNotFound: "Przepis nie został znaleziony",
    analysisFailedGeneric: "Nie udało się przeanalizować składników",
    onboardingRequired: "Ukończ konfigurację profilu, aby korzystać z analizy AI",
    networkError: "Brak połączenia z internetem",
    serverError: "Wystąpił błąd serwera",
  },
} as const;

// =============================================================================
// Default State Values
// =============================================================================

export const DEFAULT_COOKED_THIS_DIALOG_STATE: CookedThisDialogState = {
  isOpen: false,
  isSubmitting: false,
  deductionItems: [],
  error: null,
};

export const DEFAULT_PAGE_STATE: Omit<RecipeDetailPageState, "expandedSubstitutions"> & {
  expandedSubstitutions: number[];
} = {
  recipe: null,
  isLoadingRecipe: true,
  recipeError: null,
  analysis: null,
  isAnalyzing: false,
  analysisError: null,
  analysisErrorCode: null,
  isEmptyInventory: false,
  canUseAI: false,
  expandedSubstitutions: [],
  cookedThisDialog: DEFAULT_COOKED_THIS_DIALOG_STATE,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps API response to view model
 */
export function mapAnalysisToViewModel(
  recipeIngredients: ParsedIngredientDTO[],
  apiResponse: SubstitutionsResponseDTO
): SubstitutionAnalysisViewModel {
  const ingredients: IngredientAnalysisViewModel[] = recipeIngredients.map((ingredient, index) => {
    const analysis = apiResponse.analysis[index];

    return {
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      status: analysis?.status ?? "missing",
      matchedItem: analysis?.matched_inventory_item ?? null,
      substitution: analysis?.substitution ?? null,
      allergyWarning: analysis?.allergy_warning ?? null,
      isStaple: ingredient.is_staple ?? false,
    };
  });

  return {
    ingredients,
    warnings: apiResponse.warnings,
    usage: {
      substitutionsUsedToday: apiResponse.usage.substitutions_used_today,
      substitutionsRemaining: apiResponse.usage.substitutions_remaining,
    },
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Creates deduction items from analysis for CookedThisDialog
 */
export function createDeductionItems(analysis: SubstitutionAnalysisViewModel): DeductionItemViewModel[] {
  return analysis.ingredients
    .filter((ing) => {
      // Include available and partial items (they have matched inventory)
      // Exclude staples (no quantity tracking)
      return (ing.status === "available" || ing.status === "partial") && ing.matchedItem && !ing.isStaple;
    })
    .map((ing) => {
      const recipeQuantity = ing.quantity ?? 0;
      const inventoryQuantity = ing.matchedItem!.quantity ?? 0;

      // Default to the minimum of recipe quantity and available inventory
      // This prevents pre-filling values that exceed what's available
      const defaultQuantity = Math.min(recipeQuantity, inventoryQuantity);

      return {
        inventoryItemId: ing.matchedItem!.id,
        name: ing.matchedItem!.name,
        suggestedQuantity: recipeQuantity,
        currentInventoryQuantity: inventoryQuantity,
        unit: ing.matchedItem!.unit ?? "",
        adjustedQuantity: defaultQuantity,
      };
    });
}

/**
 * Formats ingredient quantity and unit for display
 */
export function formatIngredientQuantity(quantity: number | null, unit: string | null): string {
  if (quantity === null) {
    return RECIPE_DETAIL_STRINGS.ingredients.noQuantity;
  }

  const formattedQuantity = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(1);

  return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
}

/**
 * Gets the appropriate warning title based on warning type
 */
export function getWarningTitle(type: SubstitutionWarningDTO["type"]): string {
  switch (type) {
    case "allergy":
      return RECIPE_DETAIL_STRINGS.warnings.allergyTitle;
    case "diet":
      return RECIPE_DETAIL_STRINGS.warnings.dietTitle;
    case "equipment":
      return RECIPE_DETAIL_STRINGS.warnings.equipmentTitle;
    default:
      return RECIPE_DETAIL_STRINGS.warnings.allergyTitle;
  }
}
