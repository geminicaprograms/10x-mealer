# View Implementation Plan: Recipes Page

## 1. Overview

The Recipes Page (`/recipes`) is the primary entry point for users to import recipes into the Mealer application. It provides two methods for recipe input: URL parsing (primary) and raw text parsing (fallback). The page also displays a list of recently imported recipes stored locally in IndexedDB for privacy compliance (recipes are never stored server-side).

Key responsibilities:

- Accept recipe URLs from supported Polish recipe websites
- Provide fallback text input for pasting raw recipe content
- Display AI usage limits for the substitutions feature
- Show recently imported recipes for quick access
- Navigate to Recipe Detail view upon successful parsing
- Store recipe data locally in IndexedDB for privacy compliance

## 2. View Routing

- **Path**: `/recipes`
- **File Location**: `src/app/recipes/page.tsx`
- **Layout**: `src/app/recipes/layout.tsx`
- **Protection**: Requires authentication (middleware check)
- **Navigation**: Accessible via bottom navigation bar ("Przepisy" tab)

The route follows the existing app structure pattern seen in `/inventory` with:

- A layout file for metadata
- A page file as the main component
- A `components/` subdirectory for page-specific components
- A `hooks/` subdirectory for custom hooks
- A `types.ts` file for page-specific types

## 3. Component Structure

```
RecipesPage
├── Header (app-level, "Przepisy" title)
├── AIUsageIndicator (substitutions remaining)
├── RecipeInputSection
│   ├── URLInputForm
│   │   ├── Input (URL field)
│   │   └── Button ("Analizuj")
│   └── TextInputCollapsible
│       ├── CollapsibleTrigger ("Wklej tekst przepisu")
│       ├── CollapsibleContent
│       │   ├── Textarea (recipe text)
│       │   └── Button ("Analizuj tekst")
├── RecentRecipesList
│   ├── EmptyState (when no recipes)
│   └── RecipeCard[] (mapped from IndexedDB data)
├── LoadingOverlay (during parsing)
└── BottomNavigation (app-level)
```

## 4. Component Details

### 4.1 RecipesPage (Main Page Component)

- **Component description**: Root page component that orchestrates the recipes view, manages parsing state, and coordinates between child components. Acts as a client component due to state management and API calls.
- **Main elements**:
  - `div` container with page layout styling
  - `AIUsageIndicator` for displaying substitution limits
  - `RecipeInputSection` for URL/text input forms
  - `RecentRecipesList` for displaying stored recipes
  - `LoadingOverlay` conditional render during parsing
- **Handled interactions**:
  - Initiates URL parsing via `handleParseUrl`
  - Initiates text parsing via `handleParseText`
  - Navigates to recipe detail on recent recipe click
  - Navigates to recipe detail after successful parse
- **Handled validation**:
  - URL format validation before API call
  - Text length validation (max 10,000 characters)
  - AI usage limit check (display warning if exhausted)
- **Types**: `RecipesPageState`, `RecentRecipe[]`, `AIUsageDTO`
- **Props**: None (page component)

### 4.2 AIUsageIndicator

- **Component description**: Displays the user's remaining AI substitution quota for the day. Shows warning state when approaching limit. Can be shared/reused from existing implementation in scan page with minor modifications.
- **Main elements**:
  - `div` container with flexbox layout
  - `span` for usage text ("Pozostało X/Y analiz")
  - `Badge` for warning/exceeded states
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**: `AIUsageState`
- **Props**:
  ```typescript
  interface AIUsageIndicatorProps {
    usage: AIUsageState | null;
    type: "scans" | "substitutions";
    className?: string;
  }
  ```

### 4.3 RecipeInputSection

- **Component description**: Container component that holds both URL and text input methods. The URL input is always visible as the primary method, while text input is in a collapsible section as fallback.
- **Main elements**:
  - `div` container with card-like styling
  - `URLInputForm` component
  - `Collapsible` from shadcn/ui wrapping text input
- **Handled interactions**:
  - Passes `onParseUrl` to URLInputForm
  - Passes `onParseText` to TextInputCollapsible
  - Manages collapsible open/close state
- **Handled validation**: Delegates to child components
- **Types**: None (composition component)
- **Props**:
  ```typescript
  interface RecipeInputSectionProps {
    onParseUrl: (url: string) => Promise<void>;
    onParseText: (text: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
  }
  ```

### 4.4 URLInputForm

- **Component description**: Primary input form for pasting recipe URLs. Includes URL validation, hint text about supported domains, and submit button.
- **Main elements**:
  - `form` with `onSubmit` handler
  - `Input` field with `type="url"` for URL entry
  - `Button` ("Analizuj") for form submission
  - `p` element for error/hint text
- **Handled interactions**:
  - `onChange` on input updates local state
  - `onSubmit` validates and calls parent handler
  - `onBlur` triggers URL format validation
- **Handled validation**:
  - URL format validation (valid URL pattern)
  - HTTPS protocol requirement
  - Non-empty validation
  - Error display from API response (domain not supported, etc.)
- **Types**: None (uses primitive types)
- **Props**:
  ```typescript
  interface URLInputFormProps {
    onSubmit: (url: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
  }
  ```

### 4.5 TextInputCollapsible

- **Component description**: Collapsible section containing a textarea for pasting raw recipe text. Serves as a fallback when URL parsing is unavailable or fails.
- **Main elements**:
  - `Collapsible` root component
  - `CollapsibleTrigger` with chevron icon and text "Wklej tekst przepisu"
  - `CollapsibleContent` containing:
    - `Textarea` for recipe text input
    - Character counter display
    - `Button` ("Analizuj tekst") for submission
- **Handled interactions**:
  - Toggle collapsible open/close
  - `onChange` on textarea updates local state
  - `onSubmit` validates and calls parent handler
- **Handled validation**:
  - Text not empty
  - Maximum 10,000 characters
  - Minimum meaningful content (at least 20 characters)
- **Types**: None (uses primitive types)
- **Props**:
  ```typescript
  interface TextInputCollapsibleProps {
    onSubmit: (text: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
  }
  ```

### 4.6 RecentRecipesList

- **Component description**: Displays a list of recently imported recipes stored in IndexedDB. Shows empty state when no recipes exist. Each recipe card is clickable to navigate to detail view.
- **Main elements**:
  - `div` container with list heading
  - `h2` section title ("Ostatnie przepisy")
  - Conditional render: `EmptyState` or `ul` with recipe cards
  - `RecipeCard` components mapped from recipe array
- **Handled interactions**:
  - Click on recipe card navigates to `/recipes/[id]`
  - Delete button on card removes from IndexedDB
- **Handled validation**: None
- **Types**: `RecentRecipe[]`
- **Props**:
  ```typescript
  interface RecentRecipesListProps {
    recipes: RecentRecipe[];
    onRecipeClick: (id: string) => void;
    onRecipeDelete: (id: string) => void;
    isLoading: boolean;
  }
  ```

### 4.7 RecipeCard

- **Component description**: Individual card component displaying a recipe summary including title, source domain, ingredient count, and timestamp.
- **Main elements**:
  - `Card` from shadcn/ui as container
  - `CardHeader` with recipe title
  - `CardContent` with:
    - Source domain badge/link
    - Ingredient count
    - Relative timestamp ("2 godziny temu")
  - Delete button (icon only, with confirmation)
- **Handled interactions**:
  - Click on card body triggers navigation
  - Click on delete button triggers confirmation dialog
  - Click on source link opens in new tab (stopPropagation)
- **Handled validation**: None
- **Types**: `RecentRecipe`
- **Props**:
  ```typescript
  interface RecipeCardProps {
    recipe: RecentRecipe;
    onClick: () => void;
    onDelete: () => void;
  }
  ```

### 4.8 EmptyState

- **Component description**: Friendly empty state displayed when no recent recipes exist. Encourages user to import their first recipe.
- **Main elements**:
  - `div` centered container
  - Illustration/icon (ChefHat or similar)
  - `p` primary text ("Nie masz jeszcze żadnych przepisów")
  - `p` secondary text ("Wklej link do przepisu powyżej")
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**: None
- **Props**:
  ```typescript
  interface EmptyStateProps {
    className?: string;
  }
  ```

### 4.9 LoadingOverlay

- **Component description**: Full-screen loading overlay displayed during AI parsing operations. Blocks interaction and shows progress message. Can be reused from existing implementation in scan page.
- **Main elements**:
  - Fixed position `div` covering viewport
  - Semi-transparent backdrop
  - Centered spinner/loader
  - Loading message text ("Analizuję przepis...")
- **Handled interactions**: None (blocks all interaction)
- **Handled validation**: None
- **Types**: None
- **Props**:
  ```typescript
  interface LoadingOverlayProps {
    message?: string;
    isVisible: boolean;
  }
  ```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Request payload for POST /api/recipes/parse
interface RecipeParseCommand {
  url: string;
}

// Response for POST /api/recipes/parse
interface RecipeParseResponseDTO {
  title: string;
  source_url: string;
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

// Request payload for POST /api/recipes/parse-text
interface RecipeParseTextCommand {
  text: string;
}

// Response for POST /api/recipes/parse-text
interface RecipeParseTextResponseDTO {
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

// Single parsed ingredient
interface ParsedIngredientDTO {
  name: string;
  quantity: number | null;
  unit: string | null;
  original_text: string;
  is_staple?: boolean;
}

// AI usage statistics
interface AIUsageDTO {
  date: string;
  receipt_scans: AIUsageCounterDTO;
  substitutions: AIUsageCounterDTO;
}

interface AIUsageCounterDTO {
  used: number;
  limit: number;
  remaining: number;
}

// Error response format
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetailDTO[];
  };
}
```

### 5.2 New Types (in `src/app/recipes/types.ts`)

```typescript
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

/**
 * State for recipe parsing operations
 */
export interface RecipeParsingState {
  isLoading: boolean;
  error: string | null;
  errorCode: ErrorCode | null;
}

/**
 * Combined page state
 */
export interface RecipesPageState {
  parsing: RecipeParsingState;
  aiUsage: RecipesAIUsageState;
  recentRecipes: RecentRecipe[];
  isLoadingRecipes: boolean;
}

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
  },
} as const;

/**
 * IndexedDB configuration
 */
export const RECIPES_DB_CONFIG = {
  name: "mealer-recipes",
  version: 1,
  storeName: "recipes",
  maxRecipes: 50, // LRU eviction limit
} as const;
```

## 6. State Management

### 6.1 Custom Hooks

#### `useRecipeStorage` Hook

Manages IndexedDB operations for recipe storage.

```typescript
// Location: src/app/recipes/hooks/useRecipeStorage.ts

interface UseRecipeStorageReturn {
  recipes: RecentRecipe[];
  isLoading: boolean;
  error: string | null;
  saveRecipe: (recipe: Omit<RecentRecipe, "id" | "created_at" | "last_accessed_at">) => Promise<string>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipe: (id: string) => Promise<RecentRecipe | null>;
  updateLastAccessed: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}
```

**Implementation details**:

- Initialize IndexedDB connection on mount
- Maintain LRU eviction (max 50 recipes)
- Sort recipes by `last_accessed_at` descending
- Generate UUIDs for new recipes using `crypto.randomUUID()`
- Extract `source_domain` from URL when saving
- Handle IndexedDB errors gracefully with Polish error messages

#### `useRecipeParse` Hook

Manages recipe parsing API calls and state.

```typescript
// Location: src/app/recipes/hooks/useRecipeParse.ts

interface UseRecipeParseReturn {
  parseUrl: (url: string) => Promise<RecipeParseResponseDTO | null>;
  parseText: (text: string) => Promise<RecipeParseTextResponseDTO | null>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}
```

**Implementation details**:

- Handle API calls to `/api/recipes/parse` and `/api/recipes/parse-text`
- Map API error codes to Polish error messages
- Handle network errors
- Manage loading state
- Provide reset function to clear error state

#### `useAIUsage` Hook

Fetches and manages AI usage statistics.

```typescript
// Location: src/app/recipes/hooks/useAIUsage.ts

interface UseAIUsageReturn {
  usage: RecipesAIUsageState;
  refetch: () => Promise<void>;
  canUseSubstitutions: boolean;
}
```

**Implementation details**:

- Fetch from `/api/ai/usage` on mount
- Expose `canUseSubstitutions` computed boolean
- Refetch capability for updating after operations

### 6.2 State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        RecipesPage                              │
│                                                                 │
│  State:                                                         │
│  - parsing: RecipeParsingState (from useRecipeParse)            │
│  - aiUsage: RecipesAIUsageState (from useAIUsage)               │
│  - recentRecipes: RecentRecipe[] (from useRecipeStorage)        │
│                                                                 │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ useAIUsage  │   │ useRecipeParse   │   │useRecipeStorage│   │
│  │             │   │                  │   │                │   │
│  │ GET /usage  │   │ POST /parse      │   │ IndexedDB ops  │   │
│  │             │   │ POST /parse-text │   │                │   │
│  └──────┬──────┘   └────────┬─────────┘   └───────┬────────┘   │
│         │                   │                     │            │
│         └───────────────────┴─────────────────────┘            │
│                             │                                   │
│                             ▼                                   │
│                    Component Render                             │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Success Flow After Parse

1. User submits URL or text
2. `useRecipeParse` sets `isLoading: true`, shows LoadingOverlay
3. API call completes successfully with `RecipeParseResponseDTO`
4. `useRecipeStorage.saveRecipe()` stores recipe in IndexedDB
5. Navigation to `/recipes/[id]` with the new recipe ID
6. Recipe Detail page loads from IndexedDB

## 7. API Integration

### 7.1 POST /api/recipes/parse

**Purpose**: Parse recipe from URL (server-side proxy)

**Request**:

```typescript
const response = await fetch("/api/recipes/parse", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url } satisfies RecipeParseCommand),
});
```

**Success Response (200)**:

```typescript
interface RecipeParseResponseDTO {
  title: string;
  source_url: string;
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}
```

**Error Responses**:
| Status | Code | Polish Message |
|--------|------|----------------|
| 400 | VALIDATION_ERROR | "Wprowadź poprawny adres URL" |
| 401 | UNAUTHORIZED | Redirect to /login |
| 403 | FORBIDDEN | "Ta strona nie jest obsługiwana" |
| 404 | NOT_FOUND | "Nie znaleziono przepisu pod tym adresem" |
| 422 | VALIDATION_ERROR | "Nie udało się przeanalizować przepisu" |
| 502 | EXTERNAL_SERVICE_ERROR | "Nie udało się pobrać przepisu" |

### 7.2 POST /api/recipes/parse-text

**Purpose**: Parse recipe from raw text (fallback)

**Request**:

```typescript
const response = await fetch("/api/recipes/parse-text", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text } satisfies RecipeParseTextCommand),
});
```

**Success Response (200)**:

```typescript
interface RecipeParseTextResponseDTO {
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}
```

**Error Responses**:
| Status | Code | Polish Message |
|--------|------|----------------|
| 400 | VALIDATION_ERROR | "Tekst jest zbyt krótki" / "Tekst przekracza limit" |
| 401 | UNAUTHORIZED | Redirect to /login |
| 422 | VALIDATION_ERROR | "Nie udało się przeanalizować tekstu" |

### 7.3 GET /api/ai/usage

**Purpose**: Fetch current AI usage statistics

**Request**:

```typescript
const response = await fetch("/api/ai/usage");
```

**Success Response (200)**:

```typescript
interface AIUsageDTO {
  date: string;
  receipt_scans: AIUsageCounterDTO;
  substitutions: AIUsageCounterDTO;
}
```

**Error Responses**:
| Status | Code | Action |
|--------|------|--------|
| 401 | UNAUTHORIZED | Redirect to /login |

## 8. User Interactions

### 8.1 Parse Recipe from URL

| Step | User Action               | System Response                                  |
| ---- | ------------------------- | ------------------------------------------------ |
| 1    | Pastes URL in input field | Input displays URL, validates format on change   |
| 2    | Clicks "Analizuj" button  | Shows LoadingOverlay with "Analizuję przepis..." |
| 3a   | Parse succeeds            | Saves to IndexedDB, navigates to `/recipes/[id]` |
| 3b   | Parse fails               | Hides overlay, shows error message below input   |

### 8.2 Parse Recipe from Text

| Step | User Action                   | System Response                                                         |
| ---- | ----------------------------- | ----------------------------------------------------------------------- |
| 1    | Clicks "Wklej tekst przepisu" | Expands collapsible section                                             |
| 2    | Pastes/types recipe text      | Updates textarea, shows character count                                 |
| 3    | Clicks "Analizuj tekst"       | Shows LoadingOverlay with "Analizuję tekst..."                          |
| 4a   | Parse succeeds                | Saves to IndexedDB (with generated title), navigates to `/recipes/[id]` |
| 4b   | Parse fails                   | Hides overlay, shows error message                                      |

### 8.3 View Recent Recipe

| Step | User Action           | System Response                                          |
| ---- | --------------------- | -------------------------------------------------------- |
| 1    | Clicks on recipe card | Updates `last_accessed_at`, navigates to `/recipes/[id]` |

### 8.4 Delete Recent Recipe

| Step | User Action                | System Response                      |
| ---- | -------------------------- | ------------------------------------ |
| 1    | Clicks delete icon on card | Shows confirmation dialog            |
| 2a   | Confirms deletion          | Removes from IndexedDB, updates list |
| 2b   | Cancels deletion           | Closes dialog, no changes            |

### 8.5 View Source URL

| Step | User Action               | System Response               |
| ---- | ------------------------- | ----------------------------- |
| 1    | Clicks source domain link | Opens original URL in new tab |

## 9. Conditions and Validation

### 9.1 URL Input Validation

| Condition      | Component    | Validation Logic              | UI Effect                                  |
| -------------- | ------------ | ----------------------------- | ------------------------------------------ |
| Empty URL      | URLInputForm | `url.trim().length === 0`     | Disabled button, no error shown            |
| Invalid format | URLInputForm | URL constructor throws        | Show "Wprowadź poprawny adres URL"         |
| Non-HTTPS      | URLInputForm | `!url.startsWith('https://')` | Show "Adres musi zaczynać się od https://" |

### 9.2 Text Input Validation

| Condition  | Component            | Validation Logic           | UI Effect                                         |
| ---------- | -------------------- | -------------------------- | ------------------------------------------------- |
| Empty text | TextInputCollapsible | `text.trim().length === 0` | Disabled button, no error shown                   |
| Too short  | TextInputCollapsible | `text.trim().length < 20`  | Show "Tekst jest zbyt krótki"                     |
| Too long   | TextInputCollapsible | `text.length > 10000`      | Show "Tekst przekracza limit..." + disabled input |

### 9.3 API Error Handling

| Error Code | Component Affected     | UI Effect                                        |
| ---------- | ---------------------- | ------------------------------------------------ |
| 401        | RecipesPage            | Redirect to /login via middleware or client-side |
| 403        | URLInputForm           | Show "Ta strona nie jest obsługiwana"            |
| 404        | URLInputForm           | Show "Nie znaleziono przepisu"                   |
| 422        | URLInputForm/TextInput | Show "Nie udało się przeanalizować..."           |
| 502        | URLInputForm           | Show "Nie udało się pobrać przepisu"             |
| Network    | All                    | Show toast "Brak połączenia z internetem"        |

### 9.4 IndexedDB Validation

| Condition              | Hook             | Handling                                |
| ---------------------- | ---------------- | --------------------------------------- |
| DB not available       | useRecipeStorage | Show toast, disable recent recipes list |
| Storage quota exceeded | useRecipeStorage | Evict oldest recipes, retry save        |
| Recipe not found       | useRecipeStorage | Return null, handle in component        |

## 10. Error Handling

### 10.1 Network Errors

```typescript
// In useRecipeParse hook
try {
  const response = await fetch(url, options);
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return { error: RECIPES_STRINGS.errors.networkError };
  }
  throw error;
}
```

- Display toast notification with "Brak połączenia z internetem"
- Keep form data intact for retry
- Do not navigate away

### 10.2 API Errors

```typescript
// In useRecipeParse hook
if (!response.ok) {
  const errorData = (await response.json()) as ErrorResponseDTO;

  switch (response.status) {
    case 401:
      // Handled by middleware/auth context
      window.location.href = "/login";
      return null;
    case 403:
      return { error: RECIPES_STRINGS.errors.domainNotSupported };
    case 404:
      return { error: RECIPES_STRINGS.errors.fetchFailed };
    case 422:
      return { error: RECIPES_STRINGS.errors.parseFailed };
    case 502:
      return { error: RECIPES_STRINGS.errors.fetchFailed };
    default:
      return { error: RECIPES_STRINGS.errors.serverError };
  }
}
```

### 10.3 IndexedDB Errors

```typescript
// In useRecipeStorage hook
try {
  // IndexedDB operation
} catch (error) {
  console.error("IndexedDB error:", error);
  toast.error("Błąd lokalnego przechowywania danych");
  // Graceful degradation - continue without local storage
}
```

### 10.4 Parse Result with No Ingredients

```typescript
// After successful API response
if (result.ingredients.length === 0) {
  setError(RECIPES_STRINGS.errors.noIngredients);
  return;
}
```

### 10.5 Error Display Strategy

| Error Type          | Display Method     | Duration           |
| ------------------- | ------------------ | ------------------ |
| Validation (client) | Inline below input | Until corrected    |
| API error (4xx)     | Inline below input | Until next attempt |
| Server error (5xx)  | Toast notification | 5 seconds          |
| Network error       | Toast notification | Manual dismiss     |
| IndexedDB error     | Toast notification | 5 seconds          |

## 11. Implementation Steps

### Step 1: Create Directory Structure

```
src/app/recipes/
├── components/
│   ├── index.ts
│   ├── AIUsageIndicator.tsx
│   ├── RecipeInputSection.tsx
│   ├── URLInputForm.tsx
│   ├── TextInputCollapsible.tsx
│   ├── RecentRecipesList.tsx
│   ├── RecipeCard.tsx
│   ├── EmptyState.tsx
│   ├── LoadingOverlay.tsx
│   └── DeleteConfirmDialog.tsx
├── hooks/
│   ├── index.ts
│   ├── useRecipeStorage.ts
│   ├── useRecipeParse.ts
│   └── useAIUsage.ts
├── types.ts
├── layout.tsx
└── page.tsx
```

### Step 2: Create Types File

Create `src/app/recipes/types.ts` with all type definitions, constants, and Polish strings as specified in Section 5.2.

### Step 3: Implement IndexedDB Hook (`useRecipeStorage`)

1. Create IndexedDB connection wrapper
2. Implement CRUD operations for recipes
3. Implement LRU eviction logic (max 50 recipes)
4. Add error handling with Polish messages
5. Test with browser DevTools IndexedDB inspector

### Step 4: Implement API Hooks

1. Create `useRecipeParse` hook with URL and text parsing methods
2. Create `useAIUsage` hook for fetching usage stats
3. Map API errors to Polish messages
4. Test with mock responses

### Step 5: Create UI Components (Bottom-up)

1. **EmptyState** - Simple static component
2. **LoadingOverlay** - Reuse/adapt from scan page
3. **AIUsageIndicator** - Adapt from scan page for substitutions
4. **RecipeCard** - Card component with recipe summary
5. **DeleteConfirmDialog** - Confirmation dialog using AlertDialog
6. **RecentRecipesList** - List container with empty state
7. **URLInputForm** - URL input with validation
8. **TextInputCollapsible** - Collapsible text input section
9. **RecipeInputSection** - Composition of URL and text inputs

### Step 6: Create Layout File

Create `src/app/recipes/layout.tsx` with metadata:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Przepisy | Mealer",
  description: "Importuj i analizuj przepisy kulinarne",
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Step 7: Create Main Page Component

1. Mark as `"use client"`
2. Initialize all hooks
3. Implement parse handlers with navigation
4. Compose child components
5. Handle loading and error states

### Step 8: Install Collapsible Component

Install shadcn/ui Collapsible component if not present:

```bash
npx shadcn@latest add collapsible
```

### Step 9: Add Navigation Integration

1. Update bottom navigation to include `/recipes` route
2. Ensure proper active state highlighting
3. Test navigation flow

### Step 10: Integration Testing

1. Test URL parsing with supported domains
2. Test text parsing with various formats
3. Test IndexedDB storage and retrieval
4. Test error scenarios
5. Test navigation to recipe detail (requires Recipe Detail page)
6. Test AI usage display updates

### Step 11: Accessibility Review

1. Verify proper ARIA labels on all interactive elements
2. Test keyboard navigation
3. Test with screen reader
4. Verify focus management after operations

### Step 12: Final Polish

1. Review all Polish strings for grammar
2. Test responsive layout (320-428px)
3. Verify loading states and transitions
4. Test edge cases (empty states, errors, limits)
