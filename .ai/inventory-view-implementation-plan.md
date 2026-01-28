# View Implementation Plan: Inventory

## 1. Overview

The Inventory view is the primary interface for users to manage their food inventory in the Mealer application. It provides two distinct modes of inventory management:

1. **Products Tab (Produkty)**: Displays quantitative inventory items (e.g., "500g Kurczak") with detailed information including name, quantity, unit, and category. Users can filter, sort, search, edit, and delete items.

2. **Staples Tab (Podstawowe)**: Displays basic pantry items (e.g., "Sól", "Pieprz") as a simple checkbox list indicating whether the user currently has each item (Have/Don't Have toggle).

The view supports pagination (50 items initially with "Load more"), client-side search filtering, optimistic updates for staple toggles, and provides quick access to receipt scanning and manual item entry through a floating action button (FAB).

## 2. View Routing

- **Path**: `/inventory`
- **Protection**: Route requires authentication via Next.js middleware
- **Redirect Logic**:
  - Unauthenticated users → redirect to `/login`
  - Users with incomplete onboarding can access the view but AI features (scan) require onboarding completion
- **Default View**: After successful login, users are redirected to this view

## 3. Component Structure

```
InventoryPage (page.tsx)
├── Header
│   ├── Logo/Title
│   └── SettingsIcon (link to /settings)
├── InventoryTabs
│   ├── TabsTrigger ("Produkty")
│   └── TabsTrigger ("Podstawowe")
├── TabsContent (Products)
│   ├── FilterSortRow
│   │   ├── SearchInput (optional)
│   │   ├── CategorySelect
│   │   └── SortSelect
│   ├── InventoryProductList
│   │   ├── InventoryItemCard (multiple)
│   │   │   ├── ProductInfo (name, category badge)
│   │   │   ├── QuantityDisplay (quantity + unit)
│   │   │   └── ItemActions (edit, delete)
│   │   ├── LoadMoreButton
│   │   └── Skeleton (loading state)
│   └── EmptyState (when no items)
├── TabsContent (Staples)
│   ├── StaplesList
│   │   ├── StapleToggle (multiple)
│   │   │   ├── Checkbox
│   │   │   └── Label (product name)
│   │   └── Skeleton (loading state)
│   └── EmptyState (when no staples)
├── FloatingActionButton (FAB)
│   ├── ScanButton (→ /inventory/scan)
│   └── QuickAddButton (→ opens QuickAddSheet)
├── QuickAddSheet (bottom sheet modal)
│   ├── ProductAutocomplete
│   ├── QuantityInput
│   ├── UnitSelect
│   └── AddButton
├── EditItemDialog (modal for editing quantity/unit)
│   ├── QuantityInput
│   ├── UnitSelect
│   └── SaveButton
├── DeleteConfirmDialog (confirmation modal)
└── BottomNavigation
    ├── NavItem ("Produkty" - active)
    ├── NavItem ("Skanuj")
    ├── NavItem ("Przepisy")
    └── NavItem ("Ustawienia")
```

## 4. Component Details

### 4.1 InventoryPage

- **Description**: Main page component that orchestrates the inventory view. Manages top-level state, handles data fetching, and coordinates between child components.
- **Main Elements**:
  - `<main>` container with responsive layout
  - `Header` component
  - `Tabs` from Shadcn/ui for Products/Staples switching
  - `BottomNavigation` component
- **Handled Interactions**:
  - Tab switching
  - Initial data fetch on mount
  - Coordination of child component callbacks
- **Handled Validation**: None (delegated to child components)
- **Types**: `InventoryItemDTO[]`, `CategoryDTO[]`, `PaginationDTO`
- **Props**: None (page component)

### 4.2 InventoryTabs

- **Description**: Tab navigation container for switching between Products and Staples views. Uses Shadcn/ui Tabs component with count badges showing item totals.
- **Main Elements**:
  - `Tabs` (Shadcn/ui)
  - `TabsList` with two `TabsTrigger` elements
  - `TabsContent` for each tab
- **Handled Interactions**:
  - `onValueChange` - Tab switching callback
- **Handled Validation**: None
- **Types**: `'products' | 'staples'` for active tab
- **Props**:
  - `activeTab: 'products' | 'staples'`
  - `onTabChange: (tab: 'products' | 'staples') => void`
  - `productsCount: number`
  - `staplesCount: number`
  - `children: React.ReactNode`

### 4.3 FilterSortRow

- **Description**: Horizontal row of filtering and sorting controls for the Products tab. Contains category filter dropdown, sort options, and optional search input.
- **Main Elements**:
  - `Input` for search (debounced)
  - `Select` for category filter (with "Wszystkie" option)
  - `Select` for sort (name, created_at, updated_at + asc/desc)
- **Handled Interactions**:
  - `onSearchChange` - Debounced search input (300ms)
  - `onCategoryChange` - Category filter change
  - `onSortChange` - Sort field/order change
- **Handled Validation**:
  - Search string max 100 characters
- **Types**: `CategoryDTO[]`, `FilterState`
- **Props**:
  - `categories: CategoryDTO[]`
  - `filters: FilterState`
  - `onFiltersChange: (filters: FilterState) => void`
  - `isLoading: boolean`

### 4.4 InventoryProductList

- **Description**: Scrollable list container for inventory item cards. Handles pagination and displays loading/empty states.
- **Main Elements**:
  - `<ul>` with proper list semantics
  - `InventoryItemCard` components
  - `LoadMoreButton` for pagination
  - `Skeleton` components for loading state
- **Handled Interactions**:
  - Scroll tracking for potential infinite scroll
  - Load more button click
- **Handled Validation**: None
- **Types**: `InventoryItemDTO[]`, `PaginationDTO`
- **Props**:
  - `items: InventoryItemDTO[]`
  - `pagination: PaginationDTO`
  - `isLoading: boolean`
  - `onLoadMore: () => void`
  - `onEditItem: (item: InventoryItemDTO) => void`
  - `onDeleteItem: (item: InventoryItemDTO) => void`

### 4.5 InventoryItemCard

- **Description**: Card component displaying a single inventory item with product name, quantity, unit, category badge, and action buttons.
- **Main Elements**:
  - `Card` (Shadcn/ui)
  - `CardContent` with product info
  - Category `Badge` (optional)
  - Quantity and unit display
  - `Button` for edit and delete actions
- **Handled Interactions**:
  - `onClick` edit button - Opens edit dialog
  - `onClick` delete button - Opens delete confirmation
  - Optional: swipe-to-delete gesture
- **Handled Validation**: None
- **Types**: `InventoryItemDTO`
- **Props**:
  - `item: InventoryItemDTO`
  - `onEdit: (item: InventoryItemDTO) => void`
  - `onDelete: (item: InventoryItemDTO) => void`

### 4.6 StaplesList

- **Description**: List container for staple toggle items. Displays checkboxes for each staple with optimistic update support.
- **Main Elements**:
  - `<ul>` with proper list semantics
  - `StapleToggle` components
  - `Skeleton` components for loading state
- **Handled Interactions**: None directly (delegated to StapleToggle)
- **Handled Validation**: None
- **Types**: `InventoryItemDTO[]` (filtered to `is_staple === true`)
- **Props**:
  - `items: InventoryItemDTO[]`
  - `isLoading: boolean`
  - `onToggle: (item: InventoryItemDTO, isAvailable: boolean) => void`

### 4.7 StapleToggle

- **Description**: Single staple item with checkbox toggle. Implements optimistic updates for immediate UI feedback with rollback on error.
- **Main Elements**:
  - `<li>` list item
  - `Checkbox` (Shadcn/ui)
  - `Label` with product name
- **Handled Interactions**:
  - `onCheckedChange` - Toggles availability status
- **Handled Validation**: None
- **Types**: `InventoryItemDTO`
- **Props**:
  - `item: InventoryItemDTO`
  - `onChange: (isAvailable: boolean) => void`
  - `isUpdating: boolean`

### 4.8 EmptyState

- **Description**: Friendly empty state component displayed when inventory/staples list is empty. Includes illustration, Polish text message, and call-to-action buttons.
- **Main Elements**:
  - Illustration (SVG or image)
  - `<h2>` heading with message
  - `<p>` description
  - `Button` components for CTAs
- **Handled Interactions**:
  - CTA button clicks (scan receipt, quick add, initialize staples)
- **Handled Validation**: None
- **Types**: `'products' | 'staples'`
- **Props**:
  - `type: 'products' | 'staples'`
  - `onScanReceipt: () => void`
  - `onQuickAdd: () => void`
  - `onInitializeStaples?: () => void`

### 4.9 FloatingActionButton

- **Description**: Fixed-position action button(s) for quick access to scan and add functionality. Positioned in bottom-right corner above navigation.
- **Main Elements**:
  - Container `<div>` with fixed positioning
  - `Button` for scan (primary)
  - `Button` for quick add (secondary)
- **Handled Interactions**:
  - `onClick` scan button - Navigate to `/inventory/scan`
  - `onClick` quick add button - Open QuickAddSheet
- **Handled Validation**: None
- **Types**: None
- **Props**:
  - `onScanClick: () => void`
  - `onQuickAddClick: () => void`

### 4.10 QuickAddSheet

- **Description**: Bottom sheet modal for manually adding a single inventory item. Features product autocomplete, quantity input, and unit selection.
- **Main Elements**:
  - `Sheet` (Shadcn/ui) with bottom positioning
  - `ProductAutocomplete` component
  - `QuantityInput` component
  - `UnitSelect` component
  - `Button` for submit
- **Handled Interactions**:
  - `onOpenChange` - Sheet open/close
  - `onProductSelect` - Product selection from autocomplete
  - `onQuantityChange` - Quantity input change
  - `onUnitChange` - Unit selection change
  - `onSubmit` - Add item to inventory
- **Handled Validation**:
  - Either product_id OR custom_name required
  - Quantity must be positive number
  - Unit required for quantitative items
- **Types**: `ProductDTO`, `UnitDTO`, `InventoryItemCreateCommand`
- **Props**:
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (item: InventoryItemCreateCommand) => Promise<void>`

### 4.11 EditItemDialog

- **Description**: Modal dialog for editing an inventory item's quantity and unit. Cannot change product or staple status.
- **Main Elements**:
  - `Dialog` (Shadcn/ui)
  - `DialogHeader` with item name
  - `QuantityInput` component
  - `UnitSelect` component
  - `DialogFooter` with cancel/save buttons
- **Handled Interactions**:
  - `onQuantityChange` - Quantity input change
  - `onUnitChange` - Unit selection change
  - `onSave` - Submit update
  - `onCancel` - Close dialog
- **Handled Validation**:
  - Quantity must be positive number
  - Unit must be valid (exists in units table)
  - Cannot set quantity/unit on staple items
- **Types**: `InventoryItemDTO`, `InventoryItemUpdateCommand`, `UnitDTO`
- **Props**:
  - `item: InventoryItemDTO | null`
  - `units: UnitDTO[]`
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSave: (id: string, data: InventoryItemUpdateCommand) => Promise<void>`

### 4.12 DeleteConfirmDialog

- **Description**: Confirmation modal for deleting inventory items. Supports single and batch deletion.
- **Main Elements**:
  - `AlertDialog` (Shadcn/ui)
  - `AlertDialogHeader` with warning
  - `AlertDialogDescription` listing items
  - `AlertDialogFooter` with cancel/delete buttons
- **Handled Interactions**:
  - `onConfirm` - Execute deletion
  - `onCancel` - Close dialog
- **Handled Validation**: None
- **Types**: `InventoryItemDTO[]`
- **Props**:
  - `items: InventoryItemDTO[]`
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onConfirm: () => Promise<void>`

## 5. Types

### 5.1 Existing DTOs (from `src/types.ts`)

```typescript
// Response from GET /api/inventory
interface InventoryListResponseDTO {
  data: InventoryItemDTO[];
  pagination: PaginationDTO;
}

// Single inventory item
interface InventoryItemDTO {
  id: string; // UUID
  product_id: number | null; // Reference to product_catalog
  product: ProductBriefDTO | null;
  custom_name: string | null; // User-defined name if no product
  quantity: number | null; // Null for staples
  unit: UnitBriefDTO | null; // Null for staples
  is_staple: boolean; // true = staple, false = quantitative
  is_available: boolean; // For staples: have/don't have
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Abbreviated product for inventory
interface ProductBriefDTO {
  id: number;
  name_pl: string;
  category: CategoryBriefDTO | null;
}

// Abbreviated category
interface CategoryBriefDTO {
  id: number;
  name_pl: string;
}

// Abbreviated unit
interface UnitBriefDTO {
  id: number;
  name_pl: string;
  abbreviation: string;
}

// Pagination info
interface PaginationDTO {
  page: number;
  limit: number;
  total_items: number;
}

// Response from GET /api/categories
interface CategoriesResponseDTO {
  data: CategoryDTO[];
}

// Full category
interface CategoryDTO {
  id: number;
  name_pl: string;
  display_order: number;
}

// Command for PUT /api/inventory/:id
interface InventoryItemUpdateCommand {
  quantity?: number | null;
  unit_id?: number | null;
  is_available?: boolean;
}

// Command for DELETE /api/inventory
interface InventoryDeleteCommand {
  ids: string[];
}

// Response from DELETE /api/inventory
interface InventoryDeleteResponseDTO {
  deleted: string[];
  errors: BatchOperationErrorByIdDTO[];
  summary: BatchDeleteSummaryDTO;
}
```

### 5.2 New View Model Types

```typescript
// Filter state for Products tab
interface FilterState {
  search: string; // Search query (max 100 chars)
  categoryId: number | null; // null = all categories
  sortBy: "name" | "created_at" | "updated_at";
  sortOrder: "asc" | "desc";
}

// Tab state
type InventoryTab = "products" | "staples";

// Loading state for async operations
interface LoadingState {
  initialLoad: boolean; // First page load
  loadingMore: boolean; // Pagination load
  updating: Set<string>; // IDs of items being updated
  deleting: Set<string>; // IDs of items being deleted
}

// Optimistic update state for staples
interface OptimisticStapleUpdate {
  itemId: string;
  previousValue: boolean;
  currentValue: boolean;
}

// View-level state combining all data
interface InventoryViewState {
  activeTab: InventoryTab;
  products: InventoryItemDTO[];
  staples: InventoryItemDTO[];
  filters: FilterState;
  pagination: PaginationDTO;
  categories: CategoryDTO[];
  loading: LoadingState;
  error: string | null;
}

// Quick add form state
interface QuickAddFormState {
  productId: number | null;
  customName: string;
  quantity: number | string; // String for controlled input
  unitId: number | null;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

// Edit item form state
interface EditItemFormState {
  quantity: number | string;
  unitId: number | null;
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

## 6. State Management

### 6.1 Custom Hook: `useInventory`

A custom hook encapsulates all inventory-related state and logic.

```typescript
interface UseInventoryReturn {
  // State
  activeTab: InventoryTab;
  products: InventoryItemDTO[];
  staples: InventoryItemDTO[];
  filters: FilterState;
  pagination: PaginationDTO;
  categories: CategoryDTO[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  setActiveTab: (tab: InventoryTab) => void;
  setFilters: (filters: FilterState) => void;
  loadMore: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  updateItem: (id: string, data: InventoryItemUpdateCommand) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  toggleStaple: (item: InventoryItemDTO) => Promise<void>;
  addItem: (item: InventoryItemCreateCommand) => Promise<void>;
}
```

### 6.2 State Flow

1. **Initial Load**:
   - On mount, fetch categories and initial inventory (page 1, limit 50)
   - Separate fetch for staples (`is_staple=true`)
   - Store both lists in state

2. **Tab Switching**:
   - Switch `activeTab` state
   - If staples not loaded, fetch them
   - Maintain Products tab filters/pagination independently

3. **Filtering/Sorting (Products)**:
   - Update `filters` state
   - Re-fetch from page 1 with new params
   - Client-side search as additional filtering on loaded data

4. **Pagination**:
   - Track current page and total items
   - "Load more" appends to existing list
   - Clear list on filter/sort change

5. **Optimistic Updates (Staples)**:
   - Immediately update UI on toggle
   - Send API request
   - Rollback on error with toast notification

6. **Item Updates (Products)**:
   - Show loading indicator on item
   - Send API request
   - Update item in list on success
   - Show error toast on failure

### 6.3 Local State in Components

| Component      | Local State    | Purpose               |
| -------------- | -------------- | --------------------- |
| FilterSortRow  | `searchInput`  | Debounced input value |
| QuickAddSheet  | Form state     | Controlled inputs     |
| EditItemDialog | Form state     | Controlled inputs     |
| StapleToggle   | `isOptimistic` | Track pending update  |

## 7. API Integration

### 7.1 GET /api/inventory

**Purpose**: Fetch inventory items with filtering, sorting, and pagination.

**Request**:

```typescript
// Query parameters
interface InventoryListQueryParams {
  is_staple?: boolean;
  is_available?: boolean;
  category_id?: number;
  search?: string;
  sort_by?: "name" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
  page?: number; // Default: 1
  limit?: number; // Default: 50, max: 100
}

// Example fetch
const response = await fetch(
  "/api/inventory?" +
    new URLSearchParams({
      is_staple: "false",
      category_id: "4",
      sort_by: "name",
      sort_order: "asc",
      page: "1",
      limit: "50",
    })
);
```

**Response**: `InventoryListResponseDTO`

- Status 200: Success
- Status 400: Invalid query parameters
- Status 401: Unauthorized

### 7.2 GET /api/categories

**Purpose**: Fetch all product categories for filter dropdown.

**Request**:

```typescript
const response = await fetch("/api/categories");
```

**Response**: `CategoriesResponseDTO`

- Status 200: Success with categories array
- Status 401: Unauthorized

### 7.3 PUT /api/inventory/:id

**Purpose**: Update single inventory item.

**Request**:

```typescript
// Request body
interface InventoryItemUpdateCommand {
  quantity?: number | null;
  unit_id?: number | null;
  is_available?: boolean;
}

const response = await fetch(`/api/inventory/${itemId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    quantity: 350,
    unit_id: 1,
  }),
});
```

**Response**: `InventoryItemDTO` on success

- Status 200: Item updated
- Status 400: Validation error
- Status 401: Unauthorized
- Status 404: Item not found

### 7.4 DELETE /api/inventory

**Purpose**: Batch delete inventory items.

**Request**:

```typescript
// Request body
interface InventoryDeleteCommand {
  ids: string[]; // Max 50 items
}

const response = await fetch("/api/inventory", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ids: ["uuid1", "uuid2"],
  }),
});
```

**Response**: `InventoryDeleteResponseDTO`

- Status 200: All items deleted
- Status 207: Partial success
- Status 401: Unauthorized
- Status 422: All deletions failed

### 7.5 API Service Layer

Create a dedicated service for inventory API calls:

```typescript
// src/lib/services/inventory-api.ts
export const inventoryApi = {
  list: (params: InventoryListQueryParams): Promise<InventoryListResponseDTO>,
  update: (id: string, data: InventoryItemUpdateCommand): Promise<InventoryItemDTO>,
  delete: (ids: string[]): Promise<InventoryDeleteResponseDTO>,
  create: (items: InventoryItemCreateCommand[]): Promise<InventoryCreateResponseDTO>,
};

export const categoriesApi = {
  list: (): Promise<CategoriesResponseDTO>,
};
```

## 8. User Interactions

### 8.1 Tab Navigation

| Action             | Trigger                | Behavior                                     |
| ------------------ | ---------------------- | -------------------------------------------- |
| Switch to Products | Click "Produkty" tab   | Display products list, maintain filter state |
| Switch to Staples  | Click "Podstawowe" tab | Display staples list, load if not cached     |

### 8.2 Products Tab Interactions

| Action             | Trigger                | Behavior                                           |
| ------------------ | ---------------------- | -------------------------------------------------- |
| Search items       | Type in search input   | Debounced (300ms) client-side filter + API refetch |
| Filter by category | Select category        | API refetch with `category_id` param               |
| Change sort        | Select sort option     | API refetch with `sort_by` and `sort_order`        |
| Load more          | Click "Załaduj więcej" | Fetch next page, append to list                    |
| Edit item          | Click edit button      | Open EditItemDialog with item data                 |
| Delete item        | Click delete button    | Open DeleteConfirmDialog                           |
| Confirm delete     | Click "Usuń" in dialog | API delete, remove from list, show toast           |

### 8.3 Staples Tab Interactions

| Action              | Trigger                 | Behavior                                      |
| ------------------- | ----------------------- | --------------------------------------------- |
| Toggle availability | Click checkbox          | Optimistic update, API PUT, rollback on error |
| Initialize staples  | Click CTA (empty state) | Call POST /api/inventory/staples/init         |

### 8.4 FAB Interactions

| Action           | Trigger                | Behavior                                        |
| ---------------- | ---------------------- | ----------------------------------------------- |
| Scan receipt     | Click scan button      | Navigate to `/inventory/scan`                   |
| Quick add        | Click add button       | Open QuickAddSheet                              |
| Submit quick add | Click "Dodaj" in sheet | API POST, close sheet, refresh list, show toast |

## 9. Conditions and Validation

### 9.1 Client-Side Validation

| Field               | Condition               | Error Message (Polish)                         |
| ------------------- | ----------------------- | ---------------------------------------------- |
| Search              | Max 100 characters      | "Wyszukiwanie nie może przekraczać 100 znaków" |
| Quantity            | Must be positive number | "Ilość musi być liczbą dodatnią"               |
| Product/Custom name | One required            | "Wybierz produkt lub wpisz własną nazwę"       |
| Unit                | Required for products   | "Wybierz jednostkę"                            |

### 9.2 API Constraint Enforcement

| Constraint               | API Rule                                | UI Handling                          |
| ------------------------ | --------------------------------------- | ------------------------------------ |
| Staple items no quantity | Cannot set quantity on `is_staple=true` | Disable quantity input for staples   |
| Staple items no unit     | Cannot set unit_id on `is_staple=true`  | Disable unit select for staples      |
| Max batch delete         | 50 items per request                    | Split larger deletions into chunks   |
| Valid unit_id            | Must exist in units table               | Use dropdown with valid options only |
| Valid category_id        | Must exist in categories                | Use dropdown with fetched categories |

### 9.3 Component State Conditions

| Component               | Condition                                                     | Visual State |
| ----------------------- | ------------------------------------------------------------- | ------------ |
| LoadMoreButton          | `pagination.page * pagination.limit < pagination.total_items` | Visible      |
| EmptyState              | `items.length === 0 && !isLoading`                            | Visible      |
| Skeleton                | `isLoading && items.length === 0`                             | Visible      |
| EditItemDialog quantity | `!item.is_staple`                                             | Enabled      |
| StapleToggle checkbox   | `!isUpdating`                                                 | Enabled      |

## 10. Error Handling

### 10.1 Error Types and UI Treatment

| Error Type       | HTTP Status | UI Treatment                                                                  |
| ---------------- | ----------- | ----------------------------------------------------------------------------- |
| Network error    | -           | Toast: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie." |
| Unauthorized     | 401         | AlertDialog → redirect to `/login`                                            |
| Validation error | 400         | Inline field errors or toast with details                                     |
| Not found        | 404         | Toast: "Element nie został znaleziony"                                        |
| Server error     | 500         | Toast: "Wystąpił błąd serwera. Spróbuj ponownie."                             |
| Partial success  | 207         | PartialSuccessAlert with summary                                              |

### 10.2 Optimistic Update Rollback

```typescript
// Staple toggle with rollback
const toggleStaple = async (item: InventoryItemDTO) => {
  const previousValue = item.is_available;

  // Optimistic update
  setStaples((prev) => prev.map((s) => (s.id === item.id ? { ...s, is_available: !previousValue } : s)));

  try {
    await inventoryApi.update(item.id, { is_available: !previousValue });
  } catch (error) {
    // Rollback
    setStaples((prev) => prev.map((s) => (s.id === item.id ? { ...s, is_available: previousValue } : s)));
    toast.error("Nie udało się zaktualizować. Spróbuj ponownie.");
  }
};
```

### 10.3 Empty State Messages

| State             | Message                                   | CTA                                  |
| ----------------- | ----------------------------------------- | ------------------------------------ |
| Empty products    | "Twoja spiżarnia jest pusta"              | "Zeskanuj paragon" / "Dodaj produkt" |
| Empty staples     | "Nie masz jeszcze podstawowych produktów" | "Zainicjuj podstawowe produkty"      |
| No search results | "Nie znaleziono produktów"                | "Wyczyść filtry"                     |

## 11. Implementation Steps

### Step 1: Create Types and API Service

1. Review existing types in `src/types.ts`
2. Create new view model types in `src/app/inventory/types.ts`
3. Create API service layer in `src/lib/services/inventory-api.ts`
4. Add fetch wrapper with error handling

### Step 2: Create Custom Hook

1. Create `src/app/inventory/hooks/useInventory.ts`
2. Implement state initialization and management
3. Add API integration methods
4. Implement optimistic updates for staples
5. Add error handling and loading states

### Step 3: Create Base Components

1. Create `src/app/inventory/components/` directory
2. Implement `InventoryTabs.tsx` using Shadcn Tabs
3. Implement `FilterSortRow.tsx` with Select components
4. Implement `EmptyState.tsx` with variants

### Step 4: Create List Components

1. Implement `InventoryProductList.tsx`
2. Implement `InventoryItemCard.tsx` using Shadcn Card
3. Implement `StaplesList.tsx`
4. Implement `StapleToggle.tsx` using Shadcn Checkbox
5. Add loading skeletons for each list

### Step 5: Create Modal Components

1. Implement `QuickAddSheet.tsx` using Shadcn Sheet
2. Implement `EditItemDialog.tsx` using Shadcn Dialog
3. Implement `DeleteConfirmDialog.tsx` using Shadcn AlertDialog
4. Add form validation to each modal

### Step 6: Create FAB Component

1. Implement `FloatingActionButton.tsx`
2. Style with fixed positioning
3. Add navigation and sheet trigger logic

### Step 7: Assemble Page Component

1. Create `src/app/inventory/page.tsx`
2. Integrate useInventory hook
3. Compose all child components
4. Add layout and responsive styling

### Step 8: Add Accessibility

1. Add ARIA labels to all interactive elements
2. Ensure proper focus management in modals
3. Add keyboard navigation support
4. Test with screen reader

### Step 9: Add Polish Translations

1. Create constants file for Polish strings
2. Replace all hardcoded text
3. Ensure proper pluralization rules

### Step 10: Testing and Polish

1. Test all user interactions
2. Test error scenarios
3. Test loading states
4. Test empty states
5. Test pagination
6. Verify responsive design
7. Run accessibility audit
