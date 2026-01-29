# View Implementation Plan: Recipe Detail Page

## 1. Overview

The Recipe Detail Page (`/recipes/[id]`) displays a parsed recipe with AI-powered ingredient analysis and substitution suggestions. The view compares recipe ingredients against the user's inventory to identify available, missing, and substitutable ingredients. It provides AI-generated substitution advice, displays allergy warnings, and includes a "Cooked This" (Ugotowałem to) action that deducts used ingredients from inventory.

**Core Functionality:**

- Load recipe data from IndexedDB (client-side storage for privacy)
- Fetch AI substitution analysis on-demand via API
- Display ingredient status with color-coded badges (available/missing/substitution)
- Show collapsible substitution suggestions per ingredient
- Display prominent allergy warnings
- Provide sticky "Cooked This" button with confirmation modal
- Handle edge cases: empty inventory, rate limiting, network errors

**User Stories Covered:**

- US-012: Analyze Recipe for Substitutions
- US-014: Rate Limiting Notification
- US-017: Handle Empty Inventory

## 2. View Routing

- **Path**: `/recipes/[id]`
- **Dynamic Segment**: `[id]` - UUID of the recipe stored in IndexedDB
- **File Location**: `src/app/recipes/[id]/page.tsx`
- **Layout**: Uses parent layout from `src/app/recipes/layout.tsx` (without bottom navigation)
- **Protection**: Requires authentication; AI substitution features require completed onboarding

## 3. Component Structure

```
recipes/[id]/page.tsx (RecipeDetailPage)
├── Header
│   ├── BackButton (← /recipes)
│   └── PageTitle ("Przepis")
├── RecipeHeader
│   ├── Title (h1)
│   └── SourceLink (external link)
├── SubstitutionAnalysisSection
│   ├── AIUsageIndicator
│   ├── EmptyInventoryMessage (conditional)
│   ├── AllergyWarningAlert (conditional, multiple)
│   └── IngredientsList
│       └── IngredientItem (multiple)
│           ├── IngredientStatusBadge
│           ├── IngredientInfo (name, quantity)
│           └── SubstitutionCollapsible (conditional)
├── LoadingOverlay (conditional)
└── StickyFooter
    └── CookedThisButton
        └── CookedThisDialog (modal)
            ├── DeductionItem (multiple)
            │   └── QuantityInput
            └── ConfirmButton
```

## 4. Component Details

### 4.1 RecipeDetailPage

- **Description**: Main page component that orchestrates data loading, substitution analysis, and user interactions. Acts as the container for all child components and manages the primary state.
- **Main Elements**:
  - `<main>` container with padding and scroll area
  - Header with back navigation
  - Recipe content sections
  - Sticky footer with action button
- **Handled Interactions**:
  - Page load → Load recipe from IndexedDB
  - Page mount → Update `last_accessed_at` timestamp
  - Auto-trigger → Fetch substitution analysis (if onboarding complete and not rate limited)
  - "Cooked This" button click → Open confirmation dialog
- **Validation**:
  - Recipe ID must be valid UUID format
  - Recipe must exist in IndexedDB
  - Redirect to `/recipes` if recipe not found
- **Types**:
  - `RecentRecipe` (from existing types)
  - `SubstitutionAnalysisViewModel`
  - `RecipeDetailPageState`
- **Props**: Route params `{ params: { id: string } }`

### 4.2 RecipeHeader

- **Description**: Displays the recipe title and source link at the top of the page. Provides context about where the recipe came from.
- **Main Elements**:
  - `<header>` container
  - `<h1>` for recipe title (text-xl font-semibold)
  - `<a>` external link to source with `ExternalLink` icon
  - `<span>` showing source domain
- **Handled Interactions**:
  - Click on source link → Open in new tab (target="\_blank", rel="noopener noreferrer")
- **Validation**: None
- **Types**: None (uses primitive props)
- **Props**:
  ```typescript
  interface RecipeHeaderProps {
    title: string;
    sourceUrl: string;
    sourceDomain: string;
  }
  ```

### 4.3 SubstitutionAnalysisSection

- **Description**: Container section that holds the ingredient analysis results, warnings, and empty inventory messaging. Manages the presentation of AI-generated content.
- **Main Elements**:
  - `<section>` container with aria-label
  - `AIUsageIndicator` component
  - `EmptyInventoryMessage` (conditional)
  - `AllergyWarningAlert` components (multiple, conditional)
  - `IngredientsList` component
  - Loading skeleton when fetching
- **Handled Interactions**:
  - "Retry" button click (on error) → Re-fetch substitution analysis
- **Validation**:
  - Check onboarding status before showing AI features
  - Check rate limit before allowing retry
- **Types**:
  - `SubstitutionAnalysisViewModel`
  - `SubstitutionWarningDTO`
- **Props**:
  ```typescript
  interface SubstitutionAnalysisSectionProps {
    analysis: SubstitutionAnalysisViewModel | null;
    warnings: SubstitutionWarningDTO[];
    isLoading: boolean;
    error: string | null;
    isEmptyInventory: boolean;
    canUseAI: boolean;
    onRetry: () => void;
  }
  ```

### 4.4 EmptyInventoryMessage

- **Description**: Informational message displayed when the user has no items in their inventory. Guides users to add products before using recipe tailoring (US-017).
- **Main Elements**:
  - `<Alert>` component (variant="default" or custom info variant)
  - `AlertCircle` or `Package` icon
  - `AlertTitle`: "Brak produktów w spiżarni"
  - `AlertDescription`: Message explaining limitation
  - `<Button>` link to Quick Add or Scan Receipt
- **Handled Interactions**:
  - Click "Dodaj produkty" button → Navigate to `/inventory` with action param
- **Validation**: None
- **Types**: None
- **Props**:
  ```typescript
  interface EmptyInventoryMessageProps {
    onAddProducts: () => void;
  }
  ```

### 4.5 AllergyWarningAlert

- **Description**: Prominent alert component for displaying allergy and dietary warnings detected by AI. Uses destructive styling to draw attention to potential health risks.
- **Main Elements**:
  - `<Alert>` component (variant="destructive")
  - `AlertTriangle` icon
  - `AlertTitle`: Warning type (e.g., "Ostrzeżenie - Alergia")
  - `AlertDescription`: Specific warning message in Polish
- **Handled Interactions**: None (display only)
- **Validation**: None
- **Types**:
  - `SubstitutionWarningDTO`
- **Props**:
  ```typescript
  interface AllergyWarningAlertProps {
    warning: SubstitutionWarningDTO;
  }
  ```

### 4.6 IngredientsList

- **Description**: Container component that renders the list of ingredients with their analysis status. Provides structure and accessibility for the ingredient items.
- **Main Elements**:
  - `<ul>` with role="list" and aria-label
  - `IngredientItem` components as `<li>` children
  - Visual separators between items
- **Handled Interactions**: None (delegates to children)
- **Validation**: None
- **Types**:
  - `IngredientAnalysisViewModel[]`
- **Props**:
  ```typescript
  interface IngredientsListProps {
    ingredients: IngredientAnalysisViewModel[];
    onToggleSubstitution: (ingredientIndex: number) => void;
    expandedIndices: Set<number>;
  }
  ```

### 4.7 IngredientItem

- **Description**: Individual ingredient row displaying name, quantity, status badge, and expandable substitution suggestion. Core component for the ingredient analysis feature.
- **Main Elements**:
  - `<li>` container with flex layout
  - `IngredientStatusBadge` component
  - Ingredient name and quantity text
  - `Collapsible` wrapper for substitution (if available)
  - `CollapsibleTrigger` button (ChevronDown/ChevronUp icon)
  - `CollapsibleContent` with substitution text
- **Handled Interactions**:
  - Click on collapsible trigger → Toggle substitution visibility
  - Keyboard Enter/Space on trigger → Toggle substitution
- **Validation**: None
- **Types**:
  - `IngredientAnalysisViewModel`
- **Props**:
  ```typescript
  interface IngredientItemProps {
    ingredient: IngredientAnalysisViewModel;
    isExpanded: boolean;
    onToggle: () => void;
  }
  ```

### 4.8 IngredientStatusBadge

- **Description**: Color-coded badge indicating ingredient availability status. Uses shadcn Badge component with semantic colors matching the UI plan.
- **Main Elements**:
  - `<Badge>` component with appropriate variant
  - Status text in Polish
- **Handled Interactions**: None (display only)
- **Validation**: None
- **Types**:
  - `IngredientStatus` ("available" | "partial" | "missing")
- **Props**:
  ```typescript
  interface IngredientStatusBadgeProps {
    status: IngredientStatus;
    hasSubstitution: boolean;
  }
  ```

**Badge Variants Mapping**:
| Status | hasSubstitution | Variant | Label | Color |
|--------|-----------------|---------|-------|-------|
| available | - | default | "Dostępny" | Green |
| partial | - | secondary | "Częściowo" | Yellow |
| missing | true | secondary | "Zamiennik" | Yellow |
| missing | false | destructive | "Brak" | Red |

### 4.9 SubstitutionCollapsible

- **Description**: Collapsible content area for displaying AI-generated substitution suggestions. Shows the substitute item and AI advice text.
- **Main Elements**:
  - `<Collapsible>` component wrapper
  - `<CollapsibleTrigger>` with chevron icon
  - `<CollapsibleContent>` with suggestion text
  - Substitute item name (if available)
  - AI suggestion text
- **Handled Interactions**:
  - Toggle open/close state
- **Validation**: None
- **Types**:
  - `SubstitutionSuggestionDTO`
- **Props**:
  ```typescript
  interface SubstitutionCollapsibleProps {
    substitution: SubstitutionSuggestionDTO;
    isOpen: boolean;
    onToggle: () => void;
  }
  ```

### 4.10 CookedThisButton

- **Description**: Sticky footer button that triggers the ingredient deduction flow. Remains visible at bottom of screen for easy access (US-013).
- **Main Elements**:
  - Sticky `<footer>` container (fixed to bottom)
  - `<Button>` component (full width, size="lg")
  - "Ugotowałem to" text with optional icon
- **Handled Interactions**:
  - Click → Open CookedThisDialog
- **Validation**:
  - Button disabled if recipe has no ingredients
  - Button disabled if all ingredients are staples only
- **Types**: None
- **Props**:
  ```typescript
  interface CookedThisButtonProps {
    onClick: () => void;
    disabled: boolean;
  }
  ```

### 4.11 CookedThisDialog

- **Description**: Modal dialog for confirming and adjusting ingredient deductions before updating inventory. Allows users to modify estimated quantities (US-013).
- **Main Elements**:
  - `<Dialog>` component
  - `<DialogHeader>` with title "Potwierdź zużycie składników"
  - `<ScrollArea>` for deduction items list
  - `DeductionItem` components for each deductible ingredient
  - `<DialogFooter>` with Cancel and Confirm buttons
  - Loading state during submission
- **Handled Interactions**:
  - Quantity change on DeductionItem → Update local state
  - "Anuluj" button click → Close dialog without changes
  - "Potwierdź" button click → Submit deductions to API
- **Validation**:
  - All quantities must be non-negative
  - At least one item must have quantity > 0 to submit
  - Quantity cannot exceed available inventory amount
- **Types**:
  - `DeductionItemViewModel`
  - `InventoryDeductCommand`
- **Props**:
  ```typescript
  interface CookedThisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredients: DeductionItemViewModel[];
    onConfirm: (deductions: InventoryDeductionItemCommand[]) => Promise<void>;
    isSubmitting: boolean;
  }
  ```

### 4.12 DeductionItem

- **Description**: Single row in the deduction confirmation dialog showing ingredient name, current inventory amount, and editable deduction quantity.
- **Main Elements**:
  - `<div>` container with flex layout
  - Ingredient name text
  - Current inventory amount indicator
  - `<Input>` for quantity (type="number", inputMode="decimal")
  - Unit abbreviation text
- **Handled Interactions**:
  - Quantity input change → Update parent state
  - Focus/blur handling for input validation
- **Validation**:
  - Quantity must be number ≥ 0
  - Quantity should not exceed available amount (warning, not blocking)
- **Types**:
  - `DeductionItemViewModel`
- **Props**:
  ```typescript
  interface DeductionItemProps {
    item: DeductionItemViewModel;
    onChange: (quantity: number) => void;
  }
  ```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Already defined and will be used directly
import type {
  SubstitutionsResponseDTO,
  SubstitutionsCommand,
  RecipeIngredientCommand,
  IngredientAnalysisDTO,
  IngredientStatus,
  SubstitutionSuggestionDTO,
  MatchedInventoryItemDTO,
  SubstitutionWarningDTO,
  AIUsageDTO,
  InventoryDeductCommand,
  InventoryDeductionItemCommand,
  InventoryDeductResponseDTO,
  ParsedIngredientDTO,
  ErrorResponseDTO,
} from "@/types";
```

### 5.2 Existing Types (from `src/app/recipes/types.ts`)

```typescript
// Recipe stored in IndexedDB
import type { RecentRecipe } from "../types";
```

### 5.3 New View Model Types

These types should be added to `src/app/recipes/[id]/types.ts`:

```typescript
/**
 * View Model Types for Recipe Detail Page
 */

import type {
  IngredientStatus,
  SubstitutionSuggestionDTO,
  MatchedInventoryItemDTO,
  SubstitutionWarningDTO,
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
  cookedThisDialog: {
    isOpen: boolean;
    isSubmitting: boolean;
    deductionItems: DeductionItemViewModel[];
    error: string | null;
  };
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
    .map((ing) => ({
      inventoryItemId: ing.matchedItem!.id,
      name: ing.matchedItem!.name,
      suggestedQuantity: ing.quantity ?? 0,
      currentInventoryQuantity: ing.matchedItem!.quantity ?? 0,
      unit: ing.matchedItem!.unit ?? "",
      adjustedQuantity: ing.quantity ?? 0,
    }));
}
```

## 6. State Management

### 6.1 Primary State Hook: `useRecipeDetail`

Create a custom hook `src/app/recipes/[id]/hooks/useRecipeDetail.ts` that encapsulates all page state and logic:

```typescript
interface UseRecipeDetailReturn {
  // Recipe state
  recipe: RecentRecipe | null;
  isLoadingRecipe: boolean;
  recipeError: string | null;

  // Analysis state
  analysis: SubstitutionAnalysisViewModel | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // UI state
  isEmptyInventory: boolean;
  canUseAI: boolean;
  expandedSubstitutions: Set<number>;

  // Dialog state
  cookedThisDialogState: CookedThisDialogState;

  // Actions
  retryAnalysis: () => Promise<void>;
  toggleSubstitution: (index: number) => void;
  openCookedThisDialog: () => void;
  closeCookedThisDialog: () => void;
  updateDeductionQuantity: (itemId: string, quantity: number) => void;
  confirmDeductions: () => Promise<void>;
}
```

### 6.2 State Flow

1. **On Mount**:
   - Load recipe from IndexedDB using `useRecipeStorage().getRecipe(id)`
   - Update `last_accessed_at` timestamp
   - Fetch AI usage from `GET /api/ai/usage`
   - If canUseAI && !isEmptyInventory → Auto-trigger substitution analysis

2. **Analysis Flow**:
   - Convert recipe ingredients to `RecipeIngredientCommand[]`
   - Call `POST /api/ai/substitutions`
   - Map response to `SubstitutionAnalysisViewModel`
   - Handle errors (401 → redirect, 403 → onboarding message, 429 → rate limit message)

3. **Cooked This Flow**:
   - On button click → Generate `DeductionItemViewModel[]` from analysis
   - Open dialog with editable quantities
   - On confirm → Call `POST /api/inventory/deduct`
   - Show success/error toast
   - Close dialog on success

### 6.3 Dependencies on Existing Hooks

- `useRecipeStorage` - For IndexedDB operations (get recipe, update last accessed)
- `useAIUsage` - Can be extended or reused for checking substitution limits

## 7. API Integration

### 7.1 GET Recipe from IndexedDB

- **Source**: Existing `useRecipeStorage` hook
- **Method**: `getRecipe(id: string): Promise<RecentRecipe | null>`
- **Error Handling**: If null, redirect to `/recipes`

### 7.2 POST /api/ai/substitutions

- **Endpoint**: `POST /api/ai/substitutions`
- **Request Type**: `SubstitutionsCommand`
- **Response Type**: `SubstitutionsResponseDTO`
- **Headers**: Authentication via cookies (automatic with fetch credentials)

```typescript
async function fetchSubstitutionAnalysis(ingredients: ParsedIngredientDTO[]): Promise<SubstitutionsResponseDTO> {
  const command: SubstitutionsCommand = {
    recipe_ingredients: ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
  };

  const response = await fetch("/api/ai/substitutions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    credentials: "include",
  });

  if (!response.ok) {
    const error = (await response.json()) as ErrorResponseDTO;
    throw new APIError(response.status, error.error.code, error.error.message);
  }

  return response.json();
}
```

**Error Codes**:
| Status | Code | Handling |
|--------|------|----------|
| 401 | UNAUTHORIZED | Redirect to `/login` |
| 403 | FORBIDDEN | Show onboarding required message |
| 429 | RATE_LIMITED | Show rate limit message, disable retry |
| 500 | INTERNAL_ERROR | Show generic error, allow retry |
| 502 | EXTERNAL_SERVICE_ERROR | Show service unavailable, allow retry |

### 7.3 GET /api/ai/usage

- **Endpoint**: `GET /api/ai/usage`
- **Response Type**: `AIUsageDTO`
- **Usage**: Check `substitutions.remaining > 0` to enable AI features

### 7.4 POST /api/inventory/deduct

- **Endpoint**: `POST /api/inventory/deduct`
- **Request Type**: `InventoryDeductCommand`
- **Response Type**: `InventoryDeductResponseDTO`

```typescript
async function deductInventory(deductions: InventoryDeductionItemCommand[]): Promise<InventoryDeductResponseDTO> {
  const command: InventoryDeductCommand = { deductions };

  const response = await fetch("/api/inventory/deduct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    credentials: "include",
  });

  return response.json();
}
```

## 8. User Interactions

| Interaction               | Component                   | Action                     | Outcome                                      |
| ------------------------- | --------------------------- | -------------------------- | -------------------------------------------- |
| Page load                 | RecipeDetailPage            | Load recipe from IndexedDB | Display recipe data or redirect if not found |
| Page load                 | RecipeDetailPage            | Fetch AI analysis          | Display ingredient status and suggestions    |
| Click source link         | RecipeHeader                | Open external URL          | New browser tab with recipe source           |
| Click substitution toggle | IngredientItem              | Toggle collapsible         | Show/hide substitution suggestion text       |
| Click "Ugotowałem to"     | CookedThisButton            | Open dialog                | Display deduction confirmation modal         |
| Edit quantity             | DeductionItem               | Update state               | Adjust deduction amount                      |
| Click "Potwierdź"         | CookedThisDialog            | Submit deductions          | Call API, show toast, close dialog           |
| Click "Anuluj"            | CookedThisDialog            | Close dialog               | Reset state, close modal                     |
| Click "Spróbuj ponownie"  | SubstitutionAnalysisSection | Retry fetch                | Re-request AI analysis                       |
| Click "Dodaj produkty"    | EmptyInventoryMessage       | Navigate                   | Go to `/inventory`                           |
| Swipe back / click back   | Header                      | Navigate                   | Return to `/recipes`                         |

## 9. Conditions and Validation

### 9.1 API Conditions

| Condition             | API Requirement                            | Frontend Verification                 | UI Effect                                   |
| --------------------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| Authentication        | All endpoints require auth                 | Check via session/cookie              | Redirect to `/login` on 401                 |
| Onboarding Complete   | Substitutions require completed onboarding | Check profile status or 403 response  | Show onboarding message, hide AI analysis   |
| Rate Limit            | Max substitutions per day                  | Check `usage.substitutions.remaining` | Show limit message, disable analysis button |
| Max Ingredients       | 30 ingredients per request                 | Truncate list if needed               | Silent truncation (edge case)               |
| Inventory Exists      | Deductions require valid inventory IDs     | Items filtered from analysis          | Only show deductible items                  |
| Non-negative Quantity | Deduction quantity ≥ 0                     | Input validation                      | Prevent negative input                      |

### 9.2 Validation Implementation

```typescript
// Client-side validation before API calls
function validateDeductions(items: DeductionItemViewModel[]): ValidationResult {
  const errors: string[] = [];

  // At least one item with positive quantity
  const hasValidItem = items.some((item) => item.adjustedQuantity > 0);
  if (!hasValidItem) {
    errors.push("Wybierz przynajmniej jeden składnik do odliczenia");
  }

  // No negative quantities
  const hasNegative = items.some((item) => item.adjustedQuantity < 0);
  if (hasNegative) {
    errors.push("Ilość nie może być ujemna");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

## 10. Error Handling

### 10.1 Error Scenarios and Handling

| Scenario                        | Detection                   | User Feedback                      | Recovery Action                 |
| ------------------------------- | --------------------------- | ---------------------------------- | ------------------------------- |
| Recipe not found in IndexedDB   | `getRecipe()` returns null  | Toast message                      | Redirect to `/recipes`          |
| Network error (offline)         | fetch throws network error  | Toast: "Brak połączenia..."        | Show retry button               |
| Session expired (401)           | API returns 401             | AlertDialog                        | Redirect to `/login`            |
| Onboarding required (403)       | API returns 403             | Inline message in analysis section | Link to `/onboarding`           |
| Rate limit exceeded (429)       | API returns 429             | Toast + inline message             | Show remaining time, disable AI |
| Server error (500)              | API returns 500             | Toast: "Wystąpił błąd..."          | Show retry button               |
| External service down (502)     | API returns 502             | Toast: "Usługa niedostępna..."     | Show retry button               |
| Deduction partial failure (207) | API returns 207 with errors | Toast with details                 | Show which items failed         |
| IndexedDB error                 | Storage operation fails     | Toast: "Błąd lokalnego..."         | Graceful degradation            |

### 10.2 Error Boundary

Wrap the page in an error boundary for unexpected runtime errors:

```typescript
// src/app/recipes/[id]/error.tsx
export default function RecipeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">Coś poszło nie tak</h2>
      <p className="text-muted-foreground mb-4">
        Nie udało się załadować przepisu
      </p>
      <Button onClick={reset}>Spróbuj ponownie</Button>
    </div>
  );
}
```

## 11. Implementation Steps

### Phase 1: File Structure and Types (1-2 steps)

1. **Create directory structure**:

   ```
   src/app/recipes/[id]/
   ├── page.tsx
   ├── error.tsx
   ├── loading.tsx
   ├── types.ts
   ├── hooks/
   │   ├── index.ts
   │   ├── useRecipeDetail.ts
   │   └── useSubstitutionAnalysis.ts
   └── components/
       ├── index.ts
       ├── RecipeHeader.tsx
       ├── SubstitutionAnalysisSection.tsx
       ├── EmptyInventoryMessage.tsx
       ├── AllergyWarningAlert.tsx
       ├── IngredientsList.tsx
       ├── IngredientItem.tsx
       ├── IngredientStatusBadge.tsx
       ├── CookedThisButton.tsx
       ├── CookedThisDialog.tsx
       └── DeductionItem.tsx
   ```

2. **Create types file** (`types.ts`):
   - Add all view model interfaces
   - Add Polish string constants
   - Add helper functions for mapping

### Phase 2: Basic Page Structure (3-4 steps)

3. **Implement loading state** (`loading.tsx`):
   - Skeleton for recipe header
   - Skeleton for ingredients list

4. **Implement error boundary** (`error.tsx`):
   - Error display with retry button

5. **Implement basic page component** (`page.tsx`):
   - Recipe loading from IndexedDB
   - Basic layout structure
   - Back navigation

6. **Implement RecipeHeader component**:
   - Title display
   - Source link with external icon

### Phase 3: Analysis Components (5-8 steps)

7. **Implement useSubstitutionAnalysis hook**:
   - API call to `/api/ai/substitutions`
   - Error handling for all status codes
   - Response mapping to view model

8. **Implement IngredientStatusBadge component**:
   - Badge variants based on status
   - Accessibility labels

9. **Implement IngredientItem component**:
   - Status badge display
   - Quantity/unit display
   - Collapsible trigger

10. **Implement IngredientsList component**:
    - List rendering with proper keys
    - Expanded state management

### Phase 4: Special States (9-11 steps)

11. **Implement AllergyWarningAlert component**:
    - Destructive alert styling
    - Warning type mapping

12. **Implement EmptyInventoryMessage component**:
    - Info alert styling
    - Navigation action

13. **Implement SubstitutionAnalysisSection**:
    - Combine all analysis components
    - Loading skeleton
    - Error state with retry

### Phase 5: Cooked This Feature (12-15 steps)

14. **Implement DeductionItem component**:
    - Quantity input with validation
    - Current inventory display

15. **Implement CookedThisDialog component**:
    - Modal with scroll area
    - Form state management
    - Submit handling

16. **Implement CookedThisButton component**:
    - Sticky footer positioning
    - Dialog trigger

17. **Implement deduction API integration**:
    - API call to `/api/inventory/deduct`
    - Success/error toast notifications
    - Dialog close on success

### Phase 6: Main Hook and Integration (16-18 steps)

18. **Implement useRecipeDetail hook**:
    - Combine all state management
    - Coordinate loading flows
    - Handle all user actions

19. **Complete page component integration**:
    - Wire up all components
    - Handle all edge cases
    - Test full flow

20. **Final testing and polish**:
    - Accessibility audit (keyboard navigation, screen readers)
    - Mobile responsiveness
    - Error scenario testing
    - Performance optimization (lazy loading, memoization)

### Phase 7: Edge Cases and Polish (19-20 steps)

21. **Implement rate limit handling**:
    - Check usage before analysis
    - Disable AI features when exceeded
    - Show appropriate messaging

22. **Final accessibility and UX review**:
    - ARIA labels and roles
    - Focus management in dialog
    - Loading state announcements
    - Toast message timing
