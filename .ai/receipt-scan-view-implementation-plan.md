# View Implementation Plan: Receipt Scan View

## 1. Overview

The Receipt Scan View (`/inventory/scan`) enables users to scan grocery receipts using AI-powered image processing and add extracted items to their inventory. This two-phase flow includes:

1. **Image Selection Phase**: User selects a receipt image from their device gallery, previews it, and initiates AI processing
2. **Verification Phase**: User reviews AI-extracted items (sorted by confidence), can edit/delete/add items, and confirms to batch-add to inventory

The view addresses user stories US-006 (Scan Receipt), US-007 (Verify Scanned Items), and US-014 (Rate Limiting) from the PRD. It targets Polish-speaking users and operates entirely in Polish language.

## 2. View Routing

- **Path**: `/inventory/scan`
- **File Location**: `src/app/inventory/scan/page.tsx`
- **Layout**: Uses existing `/inventory/layout.tsx`
- **Protection**: Requires authentication and completed onboarding (via Next.js middleware)
- **Navigation**: Accessible from Inventory page via FAB "Skanuj" button and bottom navigation

## 3. Component Structure

```
inventory/scan/page.tsx (ReceiptScanPage)
├── Header (with back button to /inventory)
├── AIUsageIndicator
│
├── [Phase 1: Image Selection]
│   ├── ImageUploadSection
│   │   ├── ImagePreview (conditional)
│   │   └── ImagePicker (Input type="file")
│   └── ProcessButton
│
├── [Phase 2: Verification - conditional]
│   ├── VerificationList
│   │   └── VerificationItem[] (map)
│   │       ├── ConfidenceIndicator
│   │       ├── ProductAutocomplete (existing)
│   │       ├── QuantityInput
│   │       ├── UnitSelect
│   │       └── DeleteItemButton
│   ├── AddMissingItemButton
│   └── ActionButtons (Confirm/Cancel)
│
├── LoadingOverlay (conditional - during AI processing)
├── RateLimitDialog (conditional - when limit exceeded)
└── PartialSuccessAlert (conditional - for 207 responses)
```

## 4. Component Details

### 4.1 ReceiptScanPage (Main Container)

- **Description**: Main page component orchestrating the receipt scan flow. Manages phase transitions, state via custom hook, and renders appropriate UI based on current phase.
- **Main elements**:
  - Header with back navigation
  - Conditional rendering based on `phase` state (`upload` | `processing` | `verification`)
  - Footer with action buttons
- **Handled interactions**:
  - Back navigation to `/inventory`
  - Phase transitions
- **Validation**: None at page level (delegated to child components)
- **Types**: `ScanPhase`, `ReceiptScanViewState`
- **Props**: None (page component)

### 4.2 AIUsageIndicator

- **Description**: Displays remaining AI scan quota for the day. Shows warning when approaching limit.
- **Main elements**:
  - Text: "Pozostało skanów: X/Y"
  - Warning badge when remaining < 2
- **Handled interactions**: None (display only)
- **Validation**: None
- **Types**: `AIUsageDTO`
- **Props**:
  - `scansUsed: number`
  - `scansLimit: number`
  - `scansRemaining: number`

### 4.3 ImageUploadSection

- **Description**: Container for image selection and preview. Handles file input and displays selected image preview.
- **Main elements**:
  - `Input` with `type="file"` and `accept="image/jpeg,image/png,image/webp,image/heic,image/heif"`
  - Image preview container with selected image
  - "Wybierz zdjęcie" button styled as primary CTA
  - Image size indicator
- **Handled interactions**:
  - `onChange` on file input → validates and sets image
  - "Zmień zdjęcie" action to re-select
- **Validation**:
  - File type must be: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
  - File size ≤ 10MB
  - Show error message for invalid files
- **Types**: `ImageFile` (ViewModel)
- **Props**:
  - `image: ImageFile | null`
  - `onImageSelect: (file: File) => void`
  - `onImageClear: () => void`
  - `error: string | null`
  - `disabled: boolean`

### 4.4 ProcessButton

- **Description**: Button to initiate AI receipt processing. Disabled when no image selected or during processing.
- **Main elements**:
  - `Button` with text "Przetwórz paragon"
  - Loading spinner when processing
- **Handled interactions**:
  - `onClick` → triggers `onProcess` callback
- **Validation**:
  - Disabled when `image === null`
  - Disabled when `isProcessing === true`
  - Disabled when `scansRemaining === 0`
- **Types**: None
- **Props**:
  - `onProcess: () => void`
  - `disabled: boolean`
  - `isProcessing: boolean`

### 4.5 LoadingOverlay

- **Description**: Full-screen overlay displayed during AI processing. Blocks all interaction.
- **Main elements**:
  - Fixed position overlay with backdrop
  - Animated spinner
  - Polish text: "Przetwarzanie paragonu..."
  - Optional progress hint
- **Handled interactions**: None (blocks interaction)
- **Validation**: None
- **Types**: None
- **Props**:
  - `message?: string` (default: "Przetwarzanie paragonu...")

### 4.6 VerificationList

- **Description**: Scrollable list of extracted items for verification. Items sorted by confidence (lowest first for review priority).
- **Main elements**:
  - `ScrollArea` container
  - List header with item count
  - Map of `VerificationItem` components
- **Handled interactions**:
  - Scroll navigation
- **Validation**: None
- **Types**: `VerificationItemViewModel[]`
- **Props**:
  - `items: VerificationItemViewModel[]`
  - `units: UnitDTO[]`
  - `onItemUpdate: (index: number, item: VerificationItemViewModel) => void`
  - `onItemDelete: (index: number) => void`
  - `disabled: boolean`

### 4.7 VerificationItem

- **Description**: Single item row in verification list. Displays confidence, allows editing product, quantity, unit, and deletion.
- **Main elements**:
  - `ConfidenceIndicator` (colored dot)
  - `ProductAutocomplete` (reused from inventory)
  - `Input` for quantity (inputMode="decimal")
  - `Select` for unit
  - `Button` with trash icon for deletion
- **Handled interactions**:
  - Product selection/custom name change
  - Quantity input change
  - Unit selection change
  - Delete button click
- **Validation**:
  - Product/custom name required
  - Quantity must be positive number if provided
  - Unit required if quantity provided
- **Types**: `VerificationItemViewModel`
- **Props**:
  - `item: VerificationItemViewModel`
  - `index: number`
  - `units: UnitDTO[]`
  - `onUpdate: (item: VerificationItemViewModel) => void`
  - `onDelete: () => void`
  - `disabled: boolean`

### 4.8 ConfidenceIndicator

- **Description**: Visual indicator of AI extraction confidence level.
- **Main elements**:
  - Colored dot (12x12px)
  - Green (≥0.85), Yellow (≥0.60), Red (<0.60)
  - Optional tooltip with percentage
- **Handled interactions**: Hover for tooltip (optional)
- **Validation**: None
- **Types**: None
- **Props**:
  - `confidence: number` (0-1)
  - `showTooltip?: boolean`

### 4.9 AddMissingItemButton

- **Description**: Button to add an item that was missed by AI scan.
- **Main elements**:
  - `Button` with "+" icon and "Dodaj pominięty produkt" text
  - Variant: outline
- **Handled interactions**:
  - `onClick` → triggers `onAdd` callback
- **Validation**: None
- **Types**: None
- **Props**:
  - `onAdd: () => void`
  - `disabled: boolean`

### 4.10 ActionButtons

- **Description**: Footer action buttons for confirming or canceling the verification.
- **Main elements**:
  - "Anuluj" button (variant: outline)
  - "Potwierdź" button (variant: default)
  - Loading state on confirm
- **Handled interactions**:
  - Cancel → resets to upload phase
  - Confirm → submits items to inventory
- **Validation**:
  - Confirm disabled when no valid items
  - Confirm disabled when submitting
- **Types**: None
- **Props**:
  - `onCancel: () => void`
  - `onConfirm: () => void`
  - `isSubmitting: boolean`
  - `hasValidItems: boolean`

### 4.11 RateLimitDialog

- **Description**: Modal dialog shown when user has reached daily scan limit.
- **Main elements**:
  - `AlertDialog` with title "Osiągnięto limit skanowań"
  - Message explaining daily limit
  - Suggestion to use Quick Add instead
  - "Rozumiem" button to close
- **Handled interactions**:
  - Close button → closes dialog
  - Optional: navigate to Quick Add
- **Validation**: None
- **Types**: None
- **Props**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `limit: number`

### 4.12 PartialSuccessAlert

- **Description**: Alert banner shown when batch inventory creation has partial success (207 response).
- **Main elements**:
  - `Alert` component with warning variant
  - Summary: "Dodano X z Y produktów"
  - Expandable section with error details
- **Handled interactions**:
  - Toggle expand/collapse for errors
  - Dismiss alert
- **Validation**: None
- **Types**: `BatchOperationSummary`, `BatchOperationError[]`
- **Props**:
  - `summary: { total: number; created: number; failed: number }`
  - `errors: Array<{ index: number; error: string }>`
  - `onDismiss: () => void`

## 5. Types

### 5.1 ViewModel Types (new file: `src/app/inventory/scan/types.ts`)

```typescript
/**
 * View Model Types for Receipt Scan View
 */

import type { UnitBriefDTO, ReceiptMatchedProductDTO } from "@/types";

// =============================================================================
// Phase Types
// =============================================================================

/** Current phase of the scan flow */
export type ScanPhase = "upload" | "processing" | "verification" | "submitting";

// =============================================================================
// Image Types
// =============================================================================

/** Image file with preview data */
export interface ImageFile {
  /** Original File object */
  file: File;
  /** Base64 encoded data (without data URL prefix) */
  base64: string;
  /** MIME type of the image */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Object URL for preview */
  previewUrl: string;
}

// =============================================================================
// Verification Item Types
// =============================================================================

/** Single item in verification list (ViewModel) */
export interface VerificationItemViewModel {
  /** Unique ID for React key (UUID generated on client) */
  id: string;
  /** Original name extracted by AI */
  originalName: string;
  /** Selected product from catalog (null if custom) */
  matchedProduct: ReceiptMatchedProductDTO | null;
  /** Custom name if not matched to catalog */
  customName: string;
  /** Quantity value */
  quantity: string;
  /** Selected unit */
  unit: UnitBriefDTO | null;
  /** AI confidence score (0-1) */
  confidence: number;
  /** Whether this item was added manually */
  isManuallyAdded: boolean;
  /** Validation errors for this item */
  errors: VerificationItemErrors;
}

/** Validation errors for a verification item */
export interface VerificationItemErrors {
  product?: string;
  quantity?: string;
  unit?: string;
}

/** Form state for adding a new manual item */
export interface ManualItemFormState {
  productId: number | null;
  customName: string;
  quantity: string;
  unitId: number | null;
}

// =============================================================================
// View State Types
// =============================================================================

/** Complete view state for Receipt Scan */
export interface ReceiptScanViewState {
  /** Current phase */
  phase: ScanPhase;
  /** Selected image file */
  image: ImageFile | null;
  /** Image validation error */
  imageError: string | null;
  /** Verification items */
  items: VerificationItemViewModel[];
  /** AI usage statistics */
  usage: AIUsageState | null;
  /** General error message */
  error: string | null;
  /** Whether rate limit dialog is shown */
  showRateLimitDialog: boolean;
  /** Partial success result (after submit) */
  partialSuccessResult: PartialSuccessResult | null;
}

/** AI usage state for the view */
export interface AIUsageState {
  scansUsed: number;
  scansLimit: number;
  scansRemaining: number;
}

/** Result of partial success submission */
export interface PartialSuccessResult {
  total: number;
  created: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

// =============================================================================
// Default State
// =============================================================================

export const DEFAULT_SCAN_VIEW_STATE: ReceiptScanViewState = {
  phase: "upload",
  image: null,
  imageError: null,
  items: [],
  usage: null,
  error: null,
  showRateLimitDialog: false,
  partialSuccessResult: null,
};

export const DEFAULT_MANUAL_ITEM: ManualItemFormState = {
  productId: null,
  customName: "",
  quantity: "",
  unitId: null,
};

// =============================================================================
// Polish UI Strings
// =============================================================================

export const SCAN_STRINGS = {
  // Page title
  pageTitle: "Skanuj paragon",

  // Usage indicator
  usage: {
    remaining: (remaining: number, limit: number) =>
      `Pozostało skanów: ${remaining}/${limit}`,
    warning: "Zbliżasz się do dziennego limitu",
    exceeded: "Osiągnięto dzienny limit",
  },

  // Image upload
  upload: {
    selectImage: "Wybierz zdjęcie",
    changeImage: "Zmień zdjęcie",
    imageSize: (sizeMB: string) => `Rozmiar: ${sizeMB} MB`,
    dragHint: "lub przeciągnij i upuść",
    supportedFormats: "JPG, PNG, WebP, HEIC",
  },

  // Process button
  process: {
    button: "Przetwórz paragon",
    processing: "Przetwarzanie...",
  },

  // Loading overlay
  loading: {
    message: "Przetwarzanie paragonu...",
    hint: "To może potrwać kilka sekund",
  },

  // Verification
  verification: {
    title: "Zweryfikuj produkty",
    itemCount: (count: number) =>
      count === 1 ? "1 produkt" : `${count} produktów`,
    lowConfidence: "Niskie dopasowanie",
    addMissing: "Dodaj pominięty produkt",
  },

  // Actions
  actions: {
    confirm: "Potwierdź",
    cancel: "Anuluj",
    delete: "Usuń",
    submitting: "Zapisywanie...",
  },

  // Validation errors
  validation: {
    imageRequired: "Wybierz zdjęcie paragonu",
    imageTooBig: "Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.",
    invalidFormat: "Nieprawidłowy format pliku. Dozwolone: JPG, PNG, WebP, HEIC",
    productRequired: "Wybierz produkt lub wpisz własną nazwę",
    quantityPositive: "Ilość musi być liczbą dodatnią",
    unitRequired: "Wybierz jednostkę gdy podana jest ilość",
    noValidItems: "Brak produktów do dodania",
  },

  // Error messages
  errors: {
    scanFailed: "Nie udało się przetworzyć paragonu. Spróbuj ponownie.",
    imageQuality: "Jakość zdjęcia jest zbyt niska. Zrób wyraźniejsze zdjęcie.",
    submitFailed: "Nie udało się zapisać produktów. Spróbuj ponownie.",
    networkError: "Brak połączenia z internetem.",
    rateLimited: "Osiągnięto dzienny limit skanowań.",
  },

  // Rate limit dialog
  rateLimit: {
    title: "Osiągnięto limit skanowań",
    message: (limit: number) =>
      `Wykorzystałeś już ${limit} skanów na dziś. Limit odnawia się o północy.`,
    suggestion: "Możesz dodać produkty ręcznie używając opcji „Dodaj produkt".",
    close: "Rozumiem",
  },

  // Success messages
  success: {
    itemsAdded: (count: number) =>
      count === 1 ? "Dodano 1 produkt" : `Dodano ${count} produktów`,
    partialSuccess: (created: number, total: number) =>
      `Dodano ${created} z ${total} produktów`,
  },
} as const;
```

### 5.2 API Types (already in `src/types.ts`)

The following types from `src/types.ts` are used directly:

- `ReceiptScanCommand` - Request payload for scan API
- `ReceiptScanResponseDTO` - Response from scan API
- `ReceiptScanItemDTO` - Single item from scan response
- `ReceiptMatchedProductDTO` - Matched product info
- `UnitBriefDTO` - Unit reference
- `UnitDTO` - Full unit data
- `ProductDTO` - Full product data
- `AIUsageDTO` - Usage statistics
- `InventoryItemCreateCommand` - Item creation payload
- `InventoryCreateResponseDTO` - Batch creation response
- `BatchOperationErrorByIndexDTO` - Error with index reference

## 6. State Management

### 6.1 Custom Hook: `useReceiptScan`

Create a custom hook (`src/app/inventory/scan/hooks/useReceiptScan.ts`) to encapsulate all scan-related state and logic:

```typescript
export interface UseReceiptScanReturn {
  // State
  phase: ScanPhase;
  image: ImageFile | null;
  imageError: string | null;
  items: VerificationItemViewModel[];
  usage: AIUsageState | null;
  error: string | null;
  showRateLimitDialog: boolean;
  partialSuccessResult: PartialSuccessResult | null;
  units: UnitDTO[];

  // Computed
  isProcessing: boolean;
  isSubmitting: boolean;
  canProcess: boolean;
  canSubmit: boolean;
  validItemsCount: number;

  // Actions
  selectImage: (file: File) => Promise<void>;
  clearImage: () => void;
  processReceipt: () => Promise<void>;
  updateItem: (index: number, item: VerificationItemViewModel) => void;
  deleteItem: (index: number) => void;
  addManualItem: () => void;
  submitItems: () => Promise<boolean>;
  reset: () => void;
  closeRateLimitDialog: () => void;
  dismissPartialSuccess: () => void;
}
```

### 6.2 State Flow

1. **Initial Load**: Fetch AI usage stats and units on mount
2. **Image Selection**:
   - Validate file type and size
   - Convert to base64
   - Create preview URL
3. **Processing**:
   - Check rate limit before processing
   - If limit reached, show dialog
   - Call scan API
   - Transform response to VerificationItemViewModel[]
   - Sort by confidence (ascending)
4. **Verification**:
   - Track item modifications
   - Validate items on change
5. **Submission**:
   - Filter valid items only
   - Transform to InventoryItemCreateCommand[]
   - Call batch create API
   - Handle 201/207/422 responses
   - Navigate back or show errors

### 6.3 Local State Patterns

| State              | Location   | Pattern                                 |
| ------------------ | ---------- | --------------------------------------- |
| Phase              | Hook state | `useState<ScanPhase>`                   |
| Image file         | Hook state | `useState<ImageFile \| null>`           |
| Verification items | Hook state | `useState<VerificationItemViewModel[]>` |
| Units reference    | Hook state | `useState<UnitDTO[]>` (fetched once)    |
| AI usage           | Hook state | `useState<AIUsageState \| null>`        |
| Dialogs/modals     | Hook state | `useState<boolean>`                     |
| Form errors        | Item-level | `VerificationItemErrors` in each item   |

## 7. API Integration

### 7.1 Scan Receipt API Service

Extend `src/lib/services/inventory-api.ts` (or create `src/lib/services/scan-api.ts`):

```typescript
/** Parameters for scanning receipt */
export interface ScanReceiptParams {
  image: string; // Base64 encoded
  imageType: string; // MIME type
}

export const scanApi = {
  /**
   * Scans a receipt image and extracts items.
   *
   * @param params - Image data and type
   * @returns Extracted items and usage info
   * @throws InventoryApiError on validation, rate limit, or processing errors
   */
  async scanReceipt(params: ScanReceiptParams): Promise<ReceiptScanResponseDTO> {
    return post<ReceiptScanResponseDTO>("/api/ai/scan-receipt", {
      image: params.image,
      image_type: params.imageType,
    });
  },

  /**
   * Gets current AI usage statistics.
   *
   * @returns Usage statistics for today
   */
  async getUsage(): Promise<AIUsageDTO> {
    return get<AIUsageDTO>("/api/ai/usage");
  },
};
```

### 7.2 API Request/Response Flow

1. **GET /api/ai/usage** (on mount)
   - Request: None
   - Response: `AIUsageDTO`
   - Error handling: Toast on error, continue with null usage

2. **GET /api/units** (on mount)
   - Request: None
   - Response: `UnitsResponseDTO`
   - Error handling: Toast on error, empty array fallback

3. **POST /api/ai/scan-receipt** (on process)
   - Request: `ReceiptScanCommand`
   - Response: `ReceiptScanResponseDTO`
   - Error codes:
     - 400 → Image format error
     - 401 → Redirect to login
     - 422 → Image quality too low
     - 429 → Show rate limit dialog
     - 500/502 → Generic error toast

4. **GET /api/products/search** (autocomplete during verification)
   - Request: Query params `{ q, limit }`
   - Response: `ProductSearchResponseDTO`
   - Uses existing `productsApi.search()`

5. **POST /api/inventory** (on confirm)
   - Request: `InventoryCreateCommand`
   - Response: `InventoryCreateResponseDTO`
   - Status codes:
     - 201 → All items created, success toast, navigate to inventory
     - 207 → Partial success, show alert with summary
     - 422 → All failed, show error

## 8. User Interactions

### 8.1 Image Selection Flow

1. User taps "Wybierz zdjęcie" button
2. Device file picker opens (filtered to images)
3. User selects image
4. System validates file type and size
5. If valid: shows preview, enables Process button
6. If invalid: shows error message

### 8.2 Processing Flow

1. User taps "Przetwórz paragon"
2. System checks AI usage limit
3. If limit reached: shows RateLimitDialog
4. If allowed: shows LoadingOverlay
5. System calls scan API
6. On success: transitions to verification phase
7. On error: shows appropriate error message

### 8.3 Verification Flow

1. Items displayed sorted by confidence (low first)
2. User can:
   - Edit product name via autocomplete
   - Edit quantity (numeric input)
   - Select unit from dropdown
   - Delete unwanted items
   - Add missing items manually
3. "Anuluj" returns to upload phase (clears state)
4. "Potwierdź" validates and submits

### 8.4 Submission Flow

1. User taps "Potwierdź"
2. System validates all items
3. Invalid items highlighted with errors
4. If valid: shows loading state on button
5. System calls batch create API
6. On 201: success toast, navigate to `/inventory`
7. On 207: show PartialSuccessAlert, navigate to `/inventory`
8. On error: show error toast, remain on page

## 9. Conditions and Validation

### 9.1 Image Validation

| Condition    | Check                                                                                       | Error Message                   | Component                      |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ |
| File type    | `['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)` | "Nieprawidłowy format pliku..." | ImageUploadSection             |
| File size    | `file.size <= 10 * 1024 * 1024`                                                             | "Plik jest zbyt duży..."        | ImageUploadSection             |
| File present | `image !== null`                                                                            | "Wybierz zdjęcie paragonu"      | ProcessButton (disabled state) |

### 9.2 Rate Limit Validation

| Condition   | Check                      | Action               | Component           |
| ----------- | -------------------------- | -------------------- | ------------------- |
| Daily limit | `usage.scansRemaining > 0` | Show RateLimitDialog | useReceiptScan hook |

### 9.3 Verification Item Validation

| Condition                   | Check                                                   | Error Message                    | Component        |
| --------------------------- | ------------------------------------------------------- | -------------------------------- | ---------------- |
| Product required            | `matchedProduct !== null \|\| customName.trim() !== ''` | "Wybierz produkt..."             | VerificationItem |
| Quantity positive           | `quantity === '' \|\| parseFloat(quantity) > 0`         | "Ilość musi być liczbą dodatnią" | VerificationItem |
| Unit required with quantity | `quantity === '' \|\| unit !== null`                    | "Wybierz jednostkę..."           | VerificationItem |

### 9.4 Submit Validation

| Condition       | Check                                  | Action                 | Component     |
| --------------- | -------------------------------------- | ---------------------- | ------------- |
| Has valid items | `items.filter(isValidItem).length > 0` | Disable confirm button | ActionButtons |

### 9.5 Validation Implementation

```typescript
function validateVerificationItem(item: VerificationItemViewModel): VerificationItemErrors {
  const errors: VerificationItemErrors = {};

  // Product required
  if (!item.matchedProduct && !item.customName.trim()) {
    errors.product = SCAN_STRINGS.validation.productRequired;
  }

  // Quantity validation
  if (item.quantity.trim()) {
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = SCAN_STRINGS.validation.quantityPositive;
    }
  }

  // Unit required if quantity provided
  if (item.quantity.trim() && !item.unit) {
    errors.unit = SCAN_STRINGS.validation.unitRequired;
  }

  return errors;
}

function isValidItem(item: VerificationItemViewModel): boolean {
  const errors = validateVerificationItem(item);
  return Object.keys(errors).length === 0;
}
```

## 10. Error Handling

### 10.1 Error Types and UI Treatment

| Error Type             | HTTP Status | Detection      | UI Treatment                          |
| ---------------------- | ----------- | -------------- | ------------------------------------- |
| Network error          | -           | `fetch` throws | Toast: "Brak połączenia z internetem" |
| Authentication         | 401         | API response   | Redirect to `/login`                  |
| Invalid image format   | 400         | API response   | Inline error under image preview      |
| Image quality          | 422         | API response   | Toast with retry suggestion           |
| Rate limit             | 429         | API response   | RateLimitDialog modal                 |
| Server error           | 500/502     | API response   | Toast: "Wystąpił błąd serwera..."     |
| External AI service    | 502         | API response   | Toast: "Usługa AI niedostępna"        |
| Partial create success | 207         | API response   | PartialSuccessAlert banner            |
| All items failed       | 422         | API response   | Toast + stay on verification          |

### 10.2 Error Recovery

- **Network errors**: Provide retry button
- **Image quality errors**: Allow re-selecting image
- **Rate limit**: Suggest manual add, close dialog returns to inventory
- **Partial success**: Show which items failed, navigate to inventory
- **Validation errors**: Highlight invalid fields, prevent submission

### 10.3 Graceful Degradation

- If usage API fails: Continue without usage indicator
- If units API fails: Disable unit selection, show error
- If autocomplete fails: Allow custom name entry

## 11. Implementation Steps

### Step 1: Create Directory Structure

```
src/app/inventory/scan/
├── page.tsx
├── components/
│   ├── index.ts
│   ├── AIUsageIndicator.tsx
│   ├── ImageUploadSection.tsx
│   ├── ProcessButton.tsx
│   ├── LoadingOverlay.tsx
│   ├── VerificationList.tsx
│   ├── VerificationItem.tsx
│   ├── ConfidenceIndicator.tsx
│   ├── AddMissingItemButton.tsx
│   ├── ActionButtons.tsx
│   ├── RateLimitDialog.tsx
│   └── PartialSuccessAlert.tsx
├── hooks/
│   ├── index.ts
│   └── useReceiptScan.ts
└── types.ts
```

### Step 2: Define Types

1. Create `src/app/inventory/scan/types.ts` with all ViewModel types
2. Add Polish UI strings constants
3. Define default states

### Step 3: Extend API Service

1. Add `scanApi` methods to existing service or create new file
2. Add error handling for scan-specific error codes
3. Test API integration separately

### Step 4: Implement UI Components (Bottom-up)

1. **ConfidenceIndicator** - Simple presentational component
2. **AIUsageIndicator** - Display component with warning logic
3. **ProcessButton** - Button with loading state
4. **LoadingOverlay** - Full-screen overlay with spinner
5. **ImageUploadSection** - File input with preview
6. **RateLimitDialog** - AlertDialog with message
7. **PartialSuccessAlert** - Alert banner with expandable errors
8. **AddMissingItemButton** - Simple button component
9. **ActionButtons** - Confirm/Cancel footer
10. **VerificationItem** - Complex item row with all inputs
11. **VerificationList** - List container with sorting

### Step 5: Implement Custom Hook

1. Create `useReceiptScan` hook with full state management
2. Implement image handling (selection, validation, base64 conversion)
3. Implement processing flow with API call
4. Implement verification item management (add, update, delete)
5. Implement submission flow with batch API

### Step 6: Implement Page Component

1. Create `page.tsx` with "use client" directive
2. Integrate `useReceiptScan` hook
3. Implement conditional rendering based on phase
4. Add proper accessibility attributes
5. Handle navigation (back, success redirect)

### Step 7: Testing and Polish

1. Test image selection with various file types
2. Test error handling scenarios
3. Test rate limit flow
4. Test partial success scenario
5. Verify Polish text and accessibility
6. Test on mobile viewport
7. Performance optimization (image preview, list rendering)

### Step 8: Integration Testing

1. End-to-end flow: select image → process → verify → confirm
2. Test with real receipts if possible
3. Verify inventory updates correctly
4. Test navigation flows

### Step 9: Accessibility Audit

1. Screen reader testing
2. Keyboard navigation
3. Focus management on phase transitions
4. ARIA labels verification
5. Color contrast for confidence indicators

### Step 10: Final Review

1. Code review for consistency with existing patterns
2. Verify all error messages are in Polish
3. Check loading states and disabled states
4. Verify responsive behavior
5. Update any related documentation
