# View Implementation Plan: Cooked This Modal

## 1. Overview

The "Cooked This" Modal (CookedThisDialog) is a confirmation dialog that allows users to deduct ingredients from their inventory after cooking a recipe. It appears as an overlay on the Recipe Detail page (`/recipes/[id]`) and enables users to review, adjust, and confirm ingredient deductions before updating the backend database.

**Key Features:**

- Pre-filled with estimated deduction quantities from the recipe
- Editable quantity inputs for each deductible ingredient
- Current inventory quantity reference for each item
- Staple items are excluded (no quantity tracking)
- Validation for quantities exceeding inventory
- Confirm/Cancel actions with loading states

**User Story Mapping:** US-013 (Cooked This - Usage Deduction)

## 2. View Routing

- **Path:** N/A (modal overlay, no dedicated route)
- **Parent Route:** `/recipes/[id]` (Recipe Detail page)
- **Trigger:** "Ugotowałem to" (Cooked This) sticky footer button on Recipe Detail page

The modal does not have its own route; it is rendered conditionally as a Dialog component overlay on the Recipe Detail page. The dialog state is managed locally within the page component.

## 3. Component Structure

```
RecipeDetailPage (/recipes/[id])
├── Header (navigation, title)
├── RecipeHeader (title, source URL)
├── SubstitutionAnalysisSection (ingredient analysis)
├── CookedThisButton (sticky footer trigger)
└── CookedThisDialog (modal overlay)
    ├── DialogHeader
    │   ├── DialogTitle
    │   └── DialogDescription
    ├── ScrollArea (scrollable content area)
    │   └── DeductionItem[] (list of deduction rows)
    │       ├── Ingredient name & current inventory
    │       └── Quantity input with unit suffix
    ├── Warning message (if quantities exceed inventory)
    ├── Info message (if no deductions)
    └── DialogFooter
        ├── Cancel Button
        └── Confirm Button (with loading state)
```

## 4. Component Details

### 4.1 CookedThisDialog

- **Description:** Main modal dialog for confirming ingredient deductions. Manages local state for adjusted quantities and handles form submission.
- **Location:** `src/app/recipes/[id]/components/CookedThisDialog.tsx`

- **Main elements:**
  - `Dialog` (shadcn/ui) with `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
  - `ScrollArea` (shadcn/ui) for scrollable ingredient list
  - `DeductionItem` components for each deductible ingredient
  - `Button` components for Cancel and Confirm actions
  - Warning message (conditional) for quantities exceeding inventory
  - Info message (conditional) when no deductions will be made
  - Live region for screen reader announcements

- **Handled interactions:**
  - `onOpenChange` - Dialog open/close state control
  - `onConfirm` - Async callback to submit deductions to API
  - Quantity change per item via `handleQuantityChange`
  - Cancel via close button or Escape key
  - Submit via Confirm button or Ctrl/Cmd+Enter keyboard shortcut

- **Handled validation:**
  - Quantity must be non-negative (`>= 0`)
  - Warning displayed (not blocking) when quantity exceeds current inventory
  - Empty deductions (all quantities = 0) result in immediate dialog close
  - Items filtered to only those with `adjustedQuantity > 0` before submission

- **Types:**
  - `CookedThisDialogProps` (component interface)
  - `DeductionItemViewModel` (item data structure)
  - `InventoryDeductionItemCommand` (API submission format)

- **Props:**
  | Prop | Type | Required | Description |
  |------|------|----------|-------------|
  | `open` | `boolean` | Yes | Whether dialog is open |
  | `onOpenChange` | `(open: boolean) => void` | Yes | Callback when open state changes |
  | `ingredients` | `DeductionItemViewModel[]` | Yes | Initial deduction items |
  | `onConfirm` | `(deductions: InventoryDeductionItemCommand[]) => Promise<void>` | Yes | Callback to confirm deductions |
  | `isSubmitting` | `boolean` | Yes | Whether submission is in progress |

### 4.2 DeductionItem

- **Description:** Single row component displaying an ingredient with editable deduction quantity. Shows ingredient name, current inventory amount, and an input for the deduction amount.
- **Location:** `src/app/recipes/[id]/components/DeductionItem.tsx`

- **Main elements:**
  - Container `div` with flex layout
  - Ingredient name (`p` element with `font-medium`)
  - Current inventory hint (`p` element with `text-muted-foreground`)
  - `Input` (shadcn/ui) with `type="number"` and `inputMode="decimal"`
  - Unit abbreviation suffix (`span`)
  - Screen-reader-only warning when exceeding inventory

- **Handled interactions:**
  - `onChange` - Input change event handler
  - `onBlur` - Input blur event handler for validation

- **Handled validation:**
  - Parse input as float for decimal support
  - Ignore NaN values
  - Ensure non-negative (`Math.max(0, value)`)
  - Reset to 0 on blur if invalid
  - Visual warning (yellow border) when `adjustedQuantity > currentInventoryQuantity`

- **Types:**
  - `DeductionItemProps` (component interface)
  - `DeductionItemViewModel` (item data)

- **Props:**
  | Prop | Type | Required | Description |
  |------|------|----------|-------------|
  | `item` | `DeductionItemViewModel` | Yes | Deduction item data |
  | `onChange` | `(quantity: number) => void` | Yes | Callback when quantity changes |

### 4.3 CookedThisButton

- **Description:** Sticky footer button that triggers the Cooked This dialog. Remains fixed at the bottom of the screen for easy access.
- **Location:** `src/app/recipes/[id]/components/CookedThisButton.tsx`

- **Main elements:**
  - `footer` element with `fixed` positioning
  - `Button` (shadcn/ui) with full width and large size
  - `ChefHat` icon (lucide-react)
  - Polish label "Ugotowałem to"

- **Handled interactions:**
  - `onClick` - Triggers opening of CookedThisDialog

- **Handled validation:**
  - N/A (disabled state controlled by parent)

- **Types:**
  - `CookedThisButtonProps` (component interface)

- **Props:**
  | Prop | Type | Required | Description |
  |------|------|----------|-------------|
  | `onClick` | `() => void` | Yes | Callback when button is clicked |
  | `disabled` | `boolean` | Yes | Whether button should be disabled |

## 5. Types

### 5.1 DeductionItemViewModel

Located in `src/app/recipes/[id]/types.ts`:

```typescript
interface DeductionItemViewModel {
  /** Inventory item ID (for API call) - UUID string */
  inventoryItemId: string;
  /** Display name (from inventory or recipe) */
  name: string;
  /** Suggested deduction quantity (from recipe) */
  suggestedQuantity: number;
  /** Current quantity in inventory */
  currentInventoryQuantity: number;
  /** Unit abbreviation for display (e.g., "g", "ml", "szt.") */
  unit: string;
  /** User-adjusted deduction quantity */
  adjustedQuantity: number;
}
```

### 5.2 CookedThisDialogState

Located in `src/app/recipes/[id]/types.ts`:

```typescript
interface CookedThisDialogState {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** List of deduction items */
  deductionItems: DeductionItemViewModel[];
  /** Error message if submission failed */
  error: string | null;
}
```

### 5.3 API Request/Response Types

Located in `src/types.ts`:

```typescript
// Single deduction item for API request
interface InventoryDeductionItemCommand {
  inventory_item_id: string; // UUID of inventory item
  quantity: number; // Amount to deduct
}

// Request payload
interface InventoryDeductCommand {
  deductions: InventoryDeductionItemCommand[];
}

// Single item result in response
interface InventoryDeductionResultDTO {
  id: string;
  previous_quantity: number;
  deducted: number;
  new_quantity: number;
  deleted: boolean; // true if item was deleted (quantity reached 0)
}

// Response payload
interface InventoryDeductResponseDTO {
  updated: InventoryDeductionResultDTO[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeductSummaryDTO;
}

// Summary structure
interface BatchDeductSummaryDTO {
  total: number;
  updated: number;
  deleted: number;
  failed: number;
}

// Error item structure
interface BatchOperationErrorByIdDTO {
  id: string;
  error: string;
}
```

### 5.4 CookedThisDialogProps

Component interface for CookedThisDialog:

```typescript
interface CookedThisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: DeductionItemViewModel[];
  onConfirm: (deductions: InventoryDeductionItemCommand[]) => Promise<void>;
  isSubmitting: boolean;
}
```

### 5.5 DeductionItemProps

Component interface for DeductionItem:

```typescript
interface DeductionItemProps {
  item: DeductionItemViewModel;
  onChange: (quantity: number) => void;
}
```

## 6. State Management

### 6.1 Dialog State (useRecipeDetail hook)

The main state is managed by the `useRecipeDetail` hook in `src/app/recipes/[id]/hooks/useRecipeDetail.ts`:

```typescript
const [cookedThisDialog, setCookedThisDialog] = useState<CookedThisDialogState>(DEFAULT_COOKED_THIS_DIALOG_STATE);
```

**State Actions:**

| Action                                      | Description                                                |
| ------------------------------------------- | ---------------------------------------------------------- |
| `openCookedThisDialog()`                    | Opens dialog and initializes deduction items from analysis |
| `closeCookedThisDialog()`                   | Resets dialog to default state (closed)                    |
| `updateDeductionQuantity(itemId, quantity)` | Updates adjusted quantity for specific item                |
| `confirmDeductions(deductions)`             | Submits deductions to API                                  |

### 6.2 Local Dialog State (CookedThisDialog component)

The dialog maintains local state for adjusted quantities to avoid excessive parent re-renders:

```typescript
const [items, setItems] = useState<DeductionItemViewModel[]>(ingredients);
```

**Reset Behavior:**

- Items are reset when dialog opens with new ingredients (via `useEffect`)
- This ensures fresh data when opening the dialog after changes

### 6.3 Custom Hook: useInventoryDeduction

Located in `src/app/recipes/[id]/hooks/useInventoryDeduction.ts`:

**Purpose:** Manages API calls for inventory deduction.

**State:**

```typescript
interface UseInventoryDeductionReturn {
  deductInventory: (deductions: InventoryDeductionItemCommand[]) => Promise<InventoryDeductResponseDTO | null>;
  isDeducting: boolean;
  error: string | null;
  reset: () => void;
}
```

**Features:**

- Handles API call to `POST /api/inventory/deduct`
- Manages loading state (`isDeducting`)
- Error handling with typed errors
- Automatic redirect to `/login` on 401 (session expired)
- Partial success handling (207 response)

### 6.4 Helper Function: createDeductionItems

Located in `src/app/recipes/[id]/types.ts`:

```typescript
function createDeductionItems(analysis: SubstitutionAnalysisViewModel): DeductionItemViewModel[];
```

**Purpose:** Creates deduction items from substitution analysis.

**Logic:**

1. Filter ingredients to include only:
   - Status is "available" or "partial"
   - Has matched inventory item
   - Is NOT a staple
2. Map to DeductionItemViewModel with:
   - `inventoryItemId` from matched item
   - `name` from matched item
   - `suggestedQuantity` from recipe
   - `currentInventoryQuantity` from inventory
   - `unit` from matched item
   - `adjustedQuantity` = min(recipe quantity, inventory quantity)

## 7. API Integration

### 7.1 Endpoint: POST /api/inventory/deduct

**Request:**

```typescript
const command: InventoryDeductCommand = {
  deductions: [
    { inventory_item_id: "uuid-1", quantity: 500 },
    { inventory_item_id: "uuid-2", quantity: 2 },
  ],
};

const response = await fetch("/api/inventory/deduct", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(command),
  credentials: "include",
});
```

**Response Statuses:**

| Status                    | Meaning                   | Action                                        |
| ------------------------- | ------------------------- | --------------------------------------------- |
| 200 OK                    | All deductions successful | Show success toast, close dialog              |
| 207 Multi-Status          | Partial success           | Show success toast with warning, close dialog |
| 400 Bad Request           | Invalid payload           | Show validation error                         |
| 401 Unauthorized          | Session expired           | Redirect to login                             |
| 422 Unprocessable Entity  | All deductions failed     | Show error in dialog                          |
| 500 Internal Server Error | Server error              | Show generic error message                    |

**Response Body (Success/Partial):**

```json
{
  "updated": [
    {
      "id": "uuid-1",
      "previous_quantity": 1000,
      "deducted": 500,
      "new_quantity": 500,
      "deleted": false
    }
  ],
  "errors": [],
  "summary": {
    "total": 1,
    "updated": 1,
    "deleted": 0,
    "failed": 0
  }
}
```

### 7.2 API Validation Rules

According to the API specification:

1. **Authentication:** All items must belong to the authenticated user
2. **Staples Exclusion:** Items must not be staples (staples don't have quantities)
3. **Quantity Limit:** If deduction exceeds current quantity, item will be deleted when quantity reaches 0

## 8. User Interactions

### 8.1 Opening the Dialog

| Step | Action                                       | System Response                              |
| ---- | -------------------------------------------- | -------------------------------------------- |
| 1    | User clicks "Ugotowałem to" button           | Dialog opens with pre-filled deduction items |
| 2    | System creates deduction items from analysis | Items populated with suggested quantities    |
| 3    | Focus moves to first input                   | Accessibility: keyboard navigation enabled   |

**Button Disabled Conditions:**

- No analysis data available
- Analysis is in progress
- No deductible ingredients (all missing or staples)

### 8.2 Adjusting Quantities

| Step | Action                          | System Response                  |
| ---- | ------------------------------- | -------------------------------- |
| 1    | User changes quantity in input  | Local state updates immediately  |
| 2    | If quantity > inventory         | Yellow border appears as warning |
| 3    | If quantity is invalid/negative | Value resets to 0 on blur        |

### 8.3 Confirming Deductions

| Step | Action                                 | System Response                                  |
| ---- | -------------------------------------- | ------------------------------------------------ |
| 1    | User clicks "Potwierdź"                | Button shows loading spinner                     |
| 2    | System filters items with quantity > 0 | Only non-zero items sent to API                  |
| 3    | API call to POST /api/inventory/deduct | Wait for response                                |
| 4a   | Success (200/207)                      | Toast: "Zaktualizowano spiżarnię", dialog closes |
| 4b   | Error                                  | Error shown in dialog, dialog stays open         |
| 5    | Analysis refreshes                     | Updated inventory reflected in analysis          |

### 8.4 Canceling

| Step | Action                     | System Response  |
| ---- | -------------------------- | ---------------- |
| 1a   | User clicks "Anuluj"       | Dialog closes    |
| 1b   | User presses Escape key    | Dialog closes    |
| 1c   | User clicks outside dialog | Dialog closes    |
| 2    | State resets to default    | No API call made |

### 8.5 Keyboard Shortcuts

| Key Combination    | Action                      |
| ------------------ | --------------------------- |
| `Escape`           | Close dialog (cancel)       |
| `Ctrl/Cmd + Enter` | Submit deductions (confirm) |
| `Tab`              | Navigate between inputs     |

## 9. Conditions and Validation

### 9.1 Pre-Open Conditions

| Condition            | Check                                                                         | Effect                 |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Analysis available   | `analysis !== null`                                                           | Button enabled if true |
| Not analyzing        | `!isAnalyzing`                                                                | Button enabled if true |
| Has deductible items | At least one item with status "available"/"partial", matched item, not staple | Button enabled if true |

### 9.2 Quantity Input Validation

| Validation                  | Rule                                          | UI Feedback                           |
| --------------------------- | --------------------------------------------- | ------------------------------------- |
| Non-negative                | `quantity >= 0`                               | Auto-corrected to 0 if negative       |
| Valid number                | `!isNaN(quantity)`                            | Invalid input ignored                 |
| Exceeds inventory (warning) | `adjustedQuantity > currentInventoryQuantity` | Yellow border, count shown in summary |

### 9.3 Submission Validation

| Validation               | Rule                              | Behavior                                |
| ------------------------ | --------------------------------- | --------------------------------------- |
| Empty deductions         | All quantities = 0                | Dialog closes immediately (no API call) |
| Positive quantities only | Filter items where `quantity > 0` | Only valid items sent to API            |

### 9.4 API Validation (Server-side)

| Validation                      | API Response              | Frontend Handling        |
| ------------------------------- | ------------------------- | ------------------------ |
| Items belong to user            | 401/403 error             | Redirect to login        |
| Items not staples               | Error in `errors` array   | Partial success handling |
| Quantity doesn't exceed current | Item deleted if reaches 0 | Show in response summary |

## 10. Error Handling

### 10.1 Network Errors

| Error         | Detection                | User Message (Polish)          |
| ------------- | ------------------------ | ------------------------------ |
| No connection | `TypeError` with "fetch" | "Brak połączenia z internetem" |
| Timeout       | Fetch timeout            | Generic network error          |

### 10.2 API Errors

| HTTP Status | Error Code       | User Message (Polish)                             |
| ----------- | ---------------- | ------------------------------------------------- |
| 401         | UNAUTHORIZED     | "Sesja wygasła. Zaloguj się ponownie." + redirect |
| 404         | NOT_FOUND        | "Nie znaleziono niektórych składników w spiżarni" |
| 400/422     | VALIDATION_ERROR | "Nieprawidłowe dane"                              |
| 500/503     | INTERNAL_ERROR   | "Wystąpił błąd serwera"                           |
| Other       | -                | "Nie udało się zaktualizować spiżarni"            |

### 10.3 Partial Success (207)

- Response contains both `updated` and `errors` arrays
- Success toast shown
- Failed items logged to console with warning
- Dialog closes (successful items were processed)

### 10.4 Error Display

| Error Type         | Display Location                   |
| ------------------ | ---------------------------------- |
| Network/API errors | Toast notification                 |
| Submission failure | Dialog stays open, error in state  |
| Partial failure    | Console warning, toast for success |

## 11. Implementation Steps

### Step 1: Create Types (if not existing)

1. Define `DeductionItemViewModel` in `src/app/recipes/[id]/types.ts`
2. Define `CookedThisDialogState` in `src/app/recipes/[id]/types.ts`
3. Add Polish UI strings to `RECIPE_DETAIL_STRINGS`
4. Create `DEFAULT_COOKED_THIS_DIALOG_STATE` constant
5. Implement `createDeductionItems` helper function

### Step 2: Implement useInventoryDeduction Hook

1. Create `src/app/recipes/[id]/hooks/useInventoryDeduction.ts`
2. Implement `fetchDeductInventory` async function
3. Implement `DeductionApiError` class for typed errors
4. Implement `getDefaultErrorMessage` helper
5. Implement hook with:
   - `deductInventory` function
   - `isDeducting` loading state
   - `error` state
   - `reset` function

### Step 3: Implement DeductionItem Component

1. Create `src/app/recipes/[id]/components/DeductionItem.tsx`
2. Implement layout with flex container
3. Add ingredient name and current inventory display
4. Add numeric input with:
   - `type="number"` and `inputMode="decimal"`
   - `min={0}` and `step="any"`
   - Change and blur handlers
5. Add unit suffix display
6. Add visual warning for exceeding inventory (yellow border)
7. Add accessibility attributes (`aria-label`, `aria-invalid`)

### Step 4: Implement CookedThisDialog Component

1. Create `src/app/recipes/[id]/components/CookedThisDialog.tsx`
2. Use shadcn/ui `Dialog` components
3. Implement local state for items
4. Add reset effect when dialog opens
5. Add focus management effect
6. Implement `handleQuantityChange` callback
7. Implement `handleSubmit` with filtering and mapping
8. Implement `handleCancel` callback
9. Implement keyboard shortcut handler (Ctrl+Enter)
10. Add ScrollArea for deduction items list
11. Add empty state message
12. Add warning for exceeding inventory count
13. Add info message when no deductions
14. Add loading state to Confirm button
15. Add live region for screen reader announcements

### Step 5: Implement CookedThisButton Component

1. Create `src/app/recipes/[id]/components/CookedThisButton.tsx`
2. Use fixed positioning footer
3. Add full-width Button with ChefHat icon
4. Add disabled state support
5. Add accessibility label

### Step 6: Integrate into useRecipeDetail Hook

1. Add `cookedThisDialog` state
2. Import `useInventoryDeduction` hook
3. Implement `openCookedThisDialog` function:
   - Call `createDeductionItems` with analysis
   - Set dialog state to open
4. Implement `closeCookedThisDialog` function
5. Implement `updateDeductionQuantity` function
6. Implement `confirmDeductions` function:
   - Set submitting state
   - Call `deductInventory`
   - Handle success (toast, close dialog, refresh analysis)
   - Handle error (set error state)
7. Return all dialog-related state and actions

### Step 7: Integrate into RecipeDetailPage

1. Import `CookedThisButton` and `CookedThisDialog`
2. Calculate `isCookedButtonDisabled` based on analysis state
3. Render `CookedThisButton` in sticky footer position
4. Render `CookedThisDialog` as overlay
5. Connect props to hook state and actions

### Step 8: Update Component Exports

1. Add exports to `src/app/recipes/[id]/components/index.ts`:
   - `CookedThisDialog`
   - `DeductionItem`
   - `CookedThisButton`
2. Add export to `src/app/recipes/[id]/hooks/index.ts`:
   - `useInventoryDeduction`

### Step 9: Testing

1. Test dialog open/close functionality
2. Test quantity adjustment (positive, zero, negative, decimal)
3. Test quantity exceeding inventory warning
4. Test empty deductions handling
5. Test successful submission (200)
6. Test partial success (207)
7. Test error scenarios (401, 404, 500)
8. Test keyboard navigation and shortcuts
9. Test screen reader announcements
10. Test focus management

### Step 10: Accessibility Verification

1. Verify focus trap in dialog
2. Verify Escape key closes dialog
3. Verify all inputs have proper labels
4. Verify warnings are announced
5. Verify loading states are announced
6. Test with keyboard-only navigation
